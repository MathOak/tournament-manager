import { BestOf, Match, Player, Round, SeedMode, Stage, StageFormat, Tournament, createId } from './tournament.model';

export interface MatchResult {
  winnerId: string;
  scoreA: number;
  scoreB: number;
}

export interface PlayerTournamentRecord {
  player: Player;
  wins: number;
  losses: number;
  seriesWins: number;
  seriesLosses: number;
}

export function validateMatchResult(
  match: Match,
  bestOf: BestOf,
  scoreA: number,
  scoreB: number,
): MatchResult | null {
  const target = bestOf === 3 ? 2 : 3;
  if (
    match.playerAId === null ||
    match.playerBId === null ||
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0 ||
    scoreA === scoreB ||
    Math.max(scoreA, scoreB) !== target ||
    Math.min(scoreA, scoreB) >= target
  ) {
    return null;
  }

  return { winnerId: scoreA > scoreB ? match.playerAId : match.playerBId, scoreA, scoreB };
}

export function createStage(
  players: Player[],
  format: StageFormat,
  bestOf: BestOf,
  totalRounds: number,
  name = format === 'swiss' ? 'Sistema suíço' : 'Eliminação simples',
  options: { seedOrder?: string[]; sourceStageId?: string; seedMode?: SeedMode } = {},
): Stage {
  const orderedPlayers = options.seedOrder
    ? options.seedOrder.map((id) => players.find((player) => player.id === id)).filter((player): player is Player => !!player)
    : players.slice();
  const participants = format === 'single-elimination' && options.seedOrder ? orderedPlayers : shuffle(orderedPlayers);
  const stage: Stage = {
    id: createId(),
    name,
    format,
    bestOf,
    status: 'in-progress',
    rounds: [],
    totalRounds: format === 'swiss' ? Math.max(1, totalRounds) : bracketRoundCount(participants.length),
    participantIds: participants.map((player) => player.id),
    ...(options.sourceStageId ? { sourceStageId: options.sourceStageId } : {}),
    ...(options.seedMode ? { seedMode: options.seedMode } : {}),
  };

  if (format === 'swiss') {
    stage.rounds = [createSwissRound(participants, 1, new Map(), new Set())];
  } else {
    stage.rounds = createEliminationRounds(participants, !!options.seedOrder);
    resolveByes(stage);
  }

  if (participants.length < 2) {
    stage.status = 'completed';
  }
  return stage;
}

export function createNextSwissRound(stage: Stage, players: Player[]): Round | null {
  if (stage.format !== 'swiss' || stage.rounds.length >= stage.totalRounds) {
    return null;
  }
  const roundNumber = stage.rounds.length + 1;
  const scores = new Map(players.map((player) => [player.id, 0]));
  const opponents = new Map<string, Set<string>>();
  const byePlayers = new Set<string>();

  for (const round of stage.rounds) {
    for (const match of round.matches) {
      if (match.status === 'bye' && match.winnerId) {
        scores.set(match.winnerId, (scores.get(match.winnerId) ?? 0) + 1);
        byePlayers.add(match.winnerId);
      } else if (match.status === 'completed' && match.winnerId) {
        scores.set(match.winnerId, (scores.get(match.winnerId) ?? 0) + 1);
        if (match.playerAId && match.playerBId) {
          addOpponent(opponents, match.playerAId, match.playerBId);
        }
      }
    }
  }

  const unpaired = players.slice().sort((a, b) => {
    const scoreDifference = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
    return scoreDifference || a.displayName.localeCompare(b.displayName);
  });
  return pairSwiss(unpaired, roundNumber, opponents, byePlayers);
}

export function calculateStandings(stage: Stage, players: Player[]): Array<{ player: Player; points: number; played: number }> {
  const points = new Map(players.map((player) => [player.id, 0]));
  const played = new Map(players.map((player) => [player.id, 0]));
  for (const round of stage.rounds) {
    for (const match of round.matches) {
      if (match.winnerId) {
        points.set(match.winnerId, (points.get(match.winnerId) ?? 0) + 1);
      }
      if (match.playerAId && match.playerBId && match.status === 'completed') {
        played.set(match.playerAId, (played.get(match.playerAId) ?? 0) + 1);
        played.set(match.playerBId, (played.get(match.playerBId) ?? 0) + 1);
      }
    }
  }
  return players
    .map((player) => ({ player, points: points.get(player.id) ?? 0, played: played.get(player.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.player.displayName.localeCompare(b.player.displayName));
}

export function calculateTournamentRecords(tournament: Tournament): PlayerTournamentRecord[] {
  const records = new Map(tournament.players.map((player) => [player.id, {
    player,
    wins: 0,
    losses: 0,
    seriesWins: 0,
    seriesLosses: 0,
  }]));
  for (const stage of tournament.stages) {
    for (const round of stage.rounds) {
      for (const match of round.matches) {
        if (match.status !== 'completed' || !match.playerAId || !match.playerBId || !match.winnerId) continue;
        const playerA = records.get(match.playerAId);
        const playerB = records.get(match.playerBId);
        if (!playerA || !playerB) continue;
        playerA.seriesWins += match.scoreA;
        playerA.seriesLosses += match.scoreB;
        playerB.seriesWins += match.scoreB;
        playerB.seriesLosses += match.scoreA;
        const winner = records.get(match.winnerId);
        const loser = records.get(match.winnerId === match.playerAId ? match.playerBId : match.playerAId);
        if (winner && loser) {
          winner.wins += 1;
          loser.losses += 1;
        }
      }
    }
  }
  return [...records.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.player.displayName.localeCompare(b.player.displayName));
}

export function validateMatchProgress(match: Match, bestOf: BestOf, scoreA: number, scoreB: number): boolean {
  const target = bestOf === 3 ? 2 : 3;
  return match.playerAId !== null && match.playerBId !== null &&
    Number.isInteger(scoreA) && Number.isInteger(scoreB) && scoreA >= 0 && scoreB >= 0 &&
    scoreA + scoreB > 0 &&
    scoreA <= target && scoreB <= target && !(scoreA === target && scoreB === target) &&
    Math.max(scoreA, scoreB) < target;
}

export function applyMatchProgress(stage: Stage, roundNumber: number, matchId: string, scoreA: number, scoreB: number): Stage {
  const rounds = stage.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => ({ ...match })) }));
  const match = rounds.find((round) => round.number === roundNumber)?.matches.find((item) => item.id === matchId);
  if (!match || match.status === 'bye') return stage;
  Object.assign(match, { scoreA, scoreB, winnerId: null, status: 'in-progress' as const });
  return { ...stage, rounds, status: 'in-progress' };
}

export function applyMatchResult(stage: Stage, roundNumber: number, matchId: string, result: MatchResult): Stage {
  const rounds = stage.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => ({ ...match })) }));
  const round = rounds.find((item) => item.number === roundNumber);
  const match = round?.matches.find((item) => item.id === matchId);
  if (!match || match.status === 'bye') {
    return stage;
  }
  Object.assign(match, {
    scoreA: result.scoreA,
    scoreB: result.scoreB,
    winnerId: result.winnerId,
    status: 'completed' as const,
  });

  const updated = { ...stage, rounds };
  if (stage.format === 'single-elimination') {
    for (const laterRound of rounds.filter((item) => item.number > roundNumber)) {
      for (const laterMatch of laterRound.matches) {
        Object.assign(laterMatch, {
          playerAId: null,
          playerBId: null,
          scoreA: 0,
          scoreB: 0,
          winnerId: null,
          status: 'pending' as const,
        });
      }
    }
    for (const currentMatch of round!.matches) {
      if (currentMatch.winnerId) {
        propagateWinner(updated, roundNumber, round!.matches.indexOf(currentMatch), currentMatch.winnerId);
      }
    }
  }
  const allGeneratedRoundsComplete = rounds.every((item) => item.matches.every((entry) => entry.status !== 'pending'));
  updated.status = allGeneratedRoundsComplete &&
    (stage.format !== 'swiss' || rounds.length >= stage.totalRounds)
    ? 'completed'
    : 'in-progress';
  return updated;
}

function createSwissRound(
  players: Player[],
  roundNumber: number,
  opponents: Map<string, Set<string>>,
  byePlayers: Set<string>,
): Round {
  return pairSwiss(shuffle(players), roundNumber, opponents, byePlayers);
}

function pairSwiss(
  orderedPlayers: Player[],
  roundNumber: number,
  opponents: Map<string, Set<string>>,
  byePlayers: Set<string>,
): Round {
  const remaining = orderedPlayers.slice();
  const matches: Match[] = [];
  if (remaining.length % 2 === 1) {
    let byeIndex = remaining.length - 1;
    while (byeIndex > 0 && byePlayers.has(remaining[byeIndex].id)) byeIndex -= 1;
    const [byePlayer] = remaining.splice(byeIndex, 1);
    matches.push(makeMatch(byePlayer.id, null, byePlayer.id, 'bye'));
  }

  while (remaining.length > 0) {
    const playerA = remaining.shift()!;
    let opponentIndex = remaining.findIndex((candidate) => !opponents.get(playerA.id)?.has(candidate.id));
    if (opponentIndex < 0) opponentIndex = 0;
    const [playerB] = remaining.splice(opponentIndex, 1);
    matches.push(makeMatch(playerA.id, playerB.id));
  }
  return { id: createId(), number: roundNumber, matches };
}

function createEliminationRounds(players: Player[], useSeeds: boolean): Round[] {
  if (players.length < 2) return [];
  const size = 2 ** bracketRoundCount(players.length);
  const rounds: Round[] = [];
  const slots = useSeeds ? arrangeBySeed(players, size) : shuffle(players);
  const firstRound: Round = {
    id: createId(),
    number: 1,
    matches: Array.from({ length: size / 2 }, (_, index) =>
      makeMatch(slots[index * 2]?.id ?? null, slots[index * 2 + 1]?.id ?? null),
    ),
  };
  rounds.push(firstRound);
  for (let number = 2; number <= bracketRoundCount(players.length); number += 1) {
    rounds.push({
      id: createId(),
      number,
      matches: Array.from({ length: size / 2 ** number }, () => makeMatch(null, null)),
    });
  }
  return rounds;
}

function resolveByes(stage: Stage): void {
  for (const match of stage.rounds[0]?.matches ?? []) {
    if (match.playerAId && !match.playerBId) {
      match.winnerId = match.playerAId;
      match.status = 'bye';
      propagateWinner(stage, 1, stage.rounds[0].matches.indexOf(match), match.playerAId);
    } else if (!match.playerAId && match.playerBId) {
      match.winnerId = match.playerBId;
      match.status = 'bye';
      propagateWinner(stage, 1, stage.rounds[0].matches.indexOf(match), match.playerBId);
    }
  }
}

function propagateWinner(stage: Stage, roundNumber: number, matchIndex: number, winnerId: string): void {
  if (roundNumber >= stage.rounds.length) return;
  const nextMatch = stage.rounds[roundNumber].matches[Math.floor(matchIndex / 2)];
  if (!nextMatch) return;
  if (matchIndex % 2 === 0) nextMatch.playerAId = winnerId;
  else nextMatch.playerBId = winnerId;
  const previousRound = stage.rounds[roundNumber - 1];
  const siblingFeeder = previousRound?.matches[Math.floor(matchIndex / 2) * 2 + (matchIndex % 2 === 0 ? 1 : 0)];
  const siblingSlotIsEmpty = !siblingFeeder || (!siblingFeeder.playerAId && !siblingFeeder.playerBId);
  if (nextMatch.playerAId && !nextMatch.playerBId && siblingSlotIsEmpty) {
    nextMatch.winnerId = nextMatch.playerAId;
    nextMatch.status = 'bye';
    propagateWinner(stage, roundNumber + 1, stage.rounds[roundNumber].matches.indexOf(nextMatch), nextMatch.playerAId);
  } else if (!nextMatch.playerAId && nextMatch.playerBId && siblingSlotIsEmpty) {
    nextMatch.winnerId = nextMatch.playerBId;
    nextMatch.status = 'bye';
    propagateWinner(stage, roundNumber + 1, stage.rounds[roundNumber].matches.indexOf(nextMatch), nextMatch.playerBId);
  }
}

function arrangeBySeed(players: Player[], bracketSize: number): Array<Player | undefined> {
  let positions = [1, 2];
  while (positions.length < bracketSize) {
    const nextSize = positions.length * 2;
    positions = positions.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  const bySeed = new Map(players.map((player, index) => [index + 1, player]));
  return positions.map((seed) => bySeed.get(seed));
}

function makeMatch(
  playerAId: string | null,
  playerBId: string | null,
  winnerId: string | null = null,
  status: Match['status'] = 'pending',
): Match {
  return { id: createId(), playerAId, playerBId, scoreA: 0, scoreB: 0, winnerId, status };
}

function bracketRoundCount(playerCount: number): number {
  return playerCount > 1 ? Math.ceil(Math.log2(playerCount)) : 0;
}

function addOpponent(opponents: Map<string, Set<string>>, playerId: string, opponentId: string): void {
  if (!opponents.has(playerId)) opponents.set(playerId, new Set());
  if (!opponents.has(opponentId)) opponents.set(opponentId, new Set());
  opponents.get(playerId)!.add(opponentId);
  opponents.get(opponentId)!.add(playerId);
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}
