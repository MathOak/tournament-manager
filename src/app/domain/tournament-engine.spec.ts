import { applyGoalGameResult, applyMatchProgress, applyMatchResult, calculateStandings, calculateTournamentRecords, createManualSwissRound, createNextSwissRound, createStage, generateAutomaticEliminationPairings, replaceGoalGameResult, validateEliminationPairings, validateGoalGame, validateMatchProgress, validateMatchResult, validateSwissPairings } from './tournament-engine';
import { Match, Player, createEmptyTournament } from './tournament.model';

const players: Player[] = [
  { id: 'p1', displayName: 'Ana' },
  { id: 'p2', displayName: 'Bia' },
  { id: 'p3', displayName: 'Caio' },
  { id: 'p4', displayName: 'Duda' },
];

function pendingMatch(): Match {
  return { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' };
}

describe('tournament engine', () => {
  it('validates a completed MD3 result', () => {
    expect(validateMatchResult(pendingMatch(), 3, 2, 1)?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 3, 1, 2)?.winnerId).toBe('p2');
  });

  it('validates MD1 series and goal results with penalty shootouts for ties', () => {
    expect(validateMatchResult(pendingMatch(), 1, 1, 0)?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 1, 0, 0)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 1, 2, 1, 'goals')?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 1, 2, 1, 'goals', 0, 0)?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 1, 1, 1, 'goals')).toBeNull();
    expect(validateMatchResult(pendingMatch(), 1, 1, 1, 'goals', 4, 3)?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 1, 1, 1, 'goals', 3, 3)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 1, 2, 1, 'goals', 4, 3)?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 3, 2, 1, 'goals')).toBeNull();
  });

  it('ignores stale penalty input when the regulation score already has a winner', () => {
    expect(validateGoalGame(pendingMatch(), 2, 1, 3, 3)).toEqual({ scoreA: 2, scoreB: 1, winnerId: 'p1' });
  });

  it('rejects invalid participants, ties, non-integers and scores beyond the MD target', () => {
    expect(validateMatchResult(pendingMatch(), 3, 1, 1)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 3, 2.5, 0)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 3, -1, 2)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 3, 3, 0)).toBeNull();
    expect(validateMatchResult({ ...pendingMatch(), playerBId: null }, 3, 2, 0)).toBeNull();
  });

  it('validates a completed MD5 result and rejects incomplete or impossible scores', () => {
    expect(validateMatchResult(pendingMatch(), 5, 3, 2)?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 5, 3, 3)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 5, 2, 1)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 3, 2, 2)).toBeNull();
    expect(validateMatchResult(pendingMatch(), 3, -1, 2)).toBeNull();
  });

  it('supports MD2 as first to two wins and configurable MD modes', () => {
    expect(validateMatchResult(pendingMatch(), 2, 2, 0)?.winnerId).toBe('p1');
    expect(validateMatchResult(pendingMatch(), 2, 1, 0)).toBeNull();
    expect(validateMatchProgress(pendingMatch(), 2, 1, 1)).toBe(true);
    expect(validateMatchResult(pendingMatch(), 7, 4, 2)?.winnerId).toBe('p1');
  });

  it('records football goal games individually and completes an MD2 series by game wins', () => {
    const stage = createStage(players, 'single-elimination', 2, 1, 'Playoffs', { seedOrder: players.map((player) => player.id), scoreMode: 'goals' });
    const match = stage.rounds[0].matches[0];
    const firstGame = validateGoalGame(match, 1, 0, null, null)!;
    const afterFirst = applyGoalGameResult(stage, 1, match.id, firstGame);
    expect(afterFirst.rounds[0].matches[0]).toMatchObject({ status: 'in-progress', scoreA: 1, scoreB: 0 });
    const nextMatch = afterFirst.rounds[0].matches[0];
    const secondGame = validateGoalGame(nextMatch, 2, 2, 4, 3)!;
    const completed = applyGoalGameResult(afterFirst, 1, match.id, secondGame);
    expect(completed.rounds[0].matches[0]).toMatchObject({ status: 'completed', winnerId: match.playerAId, scoreA: 2, scoreB: 0 });
    expect(completed.rounds[0].matches[0].gameResults).toHaveLength(2);
    expect(completed.rounds[0].matches[0].gameResults?.[1]).toMatchObject({ scoreA: 2, scoreB: 2, penaltyScoreA: 4, penaltyScoreB: 3 });
  });

  it('reopens a goal series and clears downstream advancement when correcting its decisive game', () => {
    const stage = createStage(players, 'single-elimination', 2, 1, 'Playoffs', { seedOrder: players.map((player) => player.id), scoreMode: 'goals' });
    const match = stage.rounds[0].matches[0];
    const afterFirst = applyGoalGameResult(stage, 1, match.id, validateGoalGame(match, 1, 0, null, null)!);
    const afterWin = applyGoalGameResult(afterFirst, 1, match.id, validateGoalGame(match, 2, 1, null, null)!);
    expect(afterWin.rounds[0].matches[0].status).toBe('completed');
    const corrected = replaceGoalGameResult(afterWin, 1, match.id, 1, validateGoalGame(match, 0, 1, null, null)!);
    expect(corrected.rounds[0].matches[0]).toMatchObject({ status: 'in-progress', winnerId: null, scoreA: 1, scoreB: 1 });
    expect(corrected.rounds[1].matches[0]).toMatchObject({ status: 'pending', playerAId: null, playerBId: null });
  });

  it('accepts partial MD3/MD5 series scores without counting them as a completed match', () => {
    expect(validateMatchProgress(pendingMatch(), 3, 1, 0)).toBe(true);
    expect(validateMatchProgress(pendingMatch(), 5, 2, 1)).toBe(true);
    expect(validateMatchProgress(pendingMatch(), 3, 2, 0)).toBe(false);
    expect(validateMatchProgress(pendingMatch(), 5, 3, 3)).toBe(false);
    expect(validateMatchProgress(pendingMatch(), 3, 0, 0)).toBe(true);
    expect(validateMatchProgress(pendingMatch(), 1, 0, 0, 'goals')).toBe(true);
  });

  it('creates a Swiss first round and standings with a bye for odd participant counts', () => {
    const stage = createStage(players.slice(0, 3), 'swiss', 3, 3);
    expect(stage.rounds[0].matches).toHaveLength(2);
    expect(stage.rounds[0].matches.filter((match) => match.status === 'bye')).toHaveLength(1);
    expect(calculateStandings(stage, players.slice(0, 3)).filter((standing) => standing.points === 1)).toHaveLength(1);
  });

  it('counts Swiss bye as a tournament win but not a played match', () => {
    const tournament = createEmptyTournament();
    tournament.players = players.slice(0, 3);
    const stage = createStage(players.slice(0, 3), 'swiss', 3, 1);
    tournament.stages = [stage];
    const bye = stage.rounds[0].matches.find((match) => match.status === 'bye')!;
    expect(calculateStandings(stage, players.slice(0, 3)).find((item) => item.player.id === bye.winnerId)).toMatchObject({ points: 1, played: 0 });
    expect(calculateTournamentRecords(tournament).find((item) => item.player.id === bye.winnerId)).toMatchObject({ wins: 1, losses: 0 });
  });

  it('does not count elimination advancement byes as a played tournament win', () => {
    const tournament = createEmptyTournament();
    tournament.players = players.slice(0, 3);
    const stage = createStage(players.slice(0, 3), 'single-elimination', 2, 1);
    tournament.stages = [stage];
    const byeWinner = stage.rounds[0].matches.find((match) => match.status === 'bye')!.winnerId;
    expect(byeWinner).toBeTruthy();
    expect(calculateTournamentRecords(tournament).find((item) => item.player.id === byeWinner)).toMatchObject({ wins: 0, losses: 0 });
  });

  it('rotates automatic Swiss byes before repeating and validates manual bye fairness', () => {
    const stage = createStage(players.slice(0, 3), 'swiss', 3, 2);
    const previousBye = stage.rounds[0].matches.find((match) => match.status === 'bye')!.winnerId!;
    const nextRound = createNextSwissRound(stage, players.slice(0, 3))!;
    const nextBye = nextRound.matches.find((match) => match.status === 'bye')!.winnerId!;
    expect(nextBye).not.toBe(previousBye);
    const remainingIds = players.slice(0, 3).map((player) => player.id).filter((id) => id !== previousBye);
    const invalidPairs = [
      { playerAId: previousBye, playerBId: null },
      { playerAId: remainingIds[0], playerBId: remainingIds[1] },
    ];
    expect(validateSwissPairings(stage, players.slice(0, 3), invalidPairs)).toContain('menor quantidade de byes');
    const fairPairs = nextRound.matches.map((match) => ({ playerAId: match.playerAId, playerBId: match.playerBId }));
    expect(createManualSwissRound(stage, players.slice(0, 3), fairPairs)?.number).toBe(2);
  });

  it('creates automatic elimination byes in round one and validates manual pairings', () => {
    const fivePlayers = [...players, { id: 'p5', displayName: 'Eva' }];
    const pairings = generateAutomaticEliminationPairings(fivePlayers.map((player) => player.id));
    expect(validateEliminationPairings(fivePlayers.map((player) => player.id), pairings)).toBeNull();
    expect(pairings.filter((pair) => !pair.playerAId || !pair.playerBId)).toHaveLength(3);
    const stage = createStage(fivePlayers, 'single-elimination', 3, 1, 'Playoffs', { pairingMode: 'automatic' });
    expect(stage.rounds[1].matches.every((match) => match.status !== 'bye' && (match.playerAId || match.playerBId))).toBe(true);
    expect(validateEliminationPairings(fivePlayers.map((player) => player.id), [
      { playerAId: 'p1', playerBId: 'p1' },
      ...pairings.slice(1),
    ])).toContain('si mesmo');
  });

  it('does not count pending, in-progress or bye matches as played series in standings', () => {
    const stage = {
      id: 's', name: 'Swiss', format: 'swiss' as const, bestOf: 3 as const, status: 'in-progress' as const,
      totalRounds: 1, participantIds: players.map((player) => player.id),
      rounds: [{ id: 'r', number: 1, matches: [
        { id: 'bye', playerAId: 'p1', playerBId: null, scoreA: 0, scoreB: 0, winnerId: 'p1', status: 'bye' as const },
        { id: 'live', playerAId: 'p2', playerBId: 'p3', scoreA: 1, scoreB: 0, winnerId: null, status: 'in-progress' as const },
        { id: 'pending', playerAId: 'p3', playerBId: 'p4', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' as const },
      ] }],
    };
    const standings = calculateStandings(stage, players);
    expect(standings.find((entry) => entry.player.id === 'p1')).toMatchObject({ points: 1, played: 0 });
    expect(standings.find((entry) => entry.player.id === 'p2')).toMatchObject({ points: 0, played: 0 });
    expect(standings.find((entry) => entry.player.id === 'p3')).toMatchObject({ points: 0, played: 0 });
  });

  it('creates elimination brackets with the next power-of-two size and resolves byes', () => {
    const fivePlayers = [...players, { id: 'p5', displayName: 'Eva' }];
    const stage = createStage(fivePlayers, 'single-elimination', 3, 1, 'Playoffs', { seedOrder: fivePlayers.map((player) => player.id) });
    expect(stage.rounds.map((round) => round.matches.length)).toEqual([4, 2, 1]);
    expect(stage.rounds[0].matches.filter((match) => match.status === 'bye')).toHaveLength(3);
    expect(stage.rounds[1].matches.some((match) => match.playerAId && match.playerBId)).toBe(true);
    expect(stage.participantIds).toHaveLength(5);
  });

  it('returns no next Swiss round for non-Swiss stages or after the configured limit', () => {
    const swiss = createStage(players, 'swiss', 3, 1);
    const elimination = createStage(players, 'single-elimination', 3, 1);
    expect(createNextSwissRound(elimination, players)).toBeNull();
    expect(createNextSwissRound(swiss, players)).toBeNull();
  });

  it('applies partial scores immutably and leaves the match without a winner', () => {
    const stage = createStage(players, 'single-elimination', 3, 1, 'Playoffs', { seedOrder: players.map((player) => player.id) });
    const originalScore = stage.rounds[0].matches[0].scoreA;
    const updated = applyMatchProgress(stage, 1, stage.rounds[0].matches[0].id, 1, 0);
    expect(updated.rounds[0].matches[0]).toMatchObject({ scoreA: 1, scoreB: 0, winnerId: null, status: 'in-progress' });
    expect(stage.rounds[0].matches[0].scoreA).toBe(originalScore);
  });

  it('starts a 0-0 goal match live without assigning a winner', () => {
    const stage = createStage(players, 'single-elimination', 1, 1, 'Final', { scoreMode: 'goals', seedOrder: players.map((player) => player.id) });
    const match = stage.rounds[0].matches[0];
    const updated = applyMatchProgress(stage, 1, match.id, 0, 0);
    expect(updated.rounds[0].matches[0]).toMatchObject({ scoreA: 0, scoreB: 0, status: 'in-progress', winnerId: null });
    expect(updated.status).toBe('in-progress');
  });

  it('generates a single-elimination bracket and propagates the winner', () => {
    const stage = createStage(players, 'single-elimination', 3, 1);
    expect(stage.rounds).toHaveLength(2);
    const firstMatch = stage.rounds[0].matches[0];
    const result = validateMatchResult(firstMatch, 3, 2, 0)!;
    const updated = applyMatchResult(stage, 1, firstMatch.id, result);
    const nextMatch = updated.rounds[1].matches[0];
    expect([nextMatch.playerAId, nextMatch.playerBId]).toContain(result.winnerId);
  });

  it('updates downstream bracket slots when an earlier result is corrected', () => {
    const stage = createStage(players, 'single-elimination', 3, 1);
    const firstMatch = stage.rounds[0].matches[0];
    const initial = validateMatchResult(firstMatch, 3, 2, 0)!;
    const afterInitial = applyMatchResult(stage, 1, firstMatch.id, initial);
    const corrected = validateMatchResult(firstMatch, 3, 0, 2)!;
    const afterCorrection = applyMatchResult(afterInitial, 1, firstMatch.id, corrected);
    expect(afterCorrection.rounds[1].matches[0].playerAId).toBe(corrected.winnerId);
    expect(afterCorrection.rounds[1].matches[0].playerBId).toBeNull();
    expect(afterCorrection.rounds[1].matches[0].status).toBe('pending');
  });

  it('places the top and bottom seeds in the first seeded elimination match', () => {
    const stage = createStage(players, 'single-elimination', 3, 1, 'Playoffs', {
      seedOrder: players.map((player) => player.id),
      seedMode: 'standings',
      sourceStageId: 'swiss-id',
    });
    expect(stage.rounds[0].matches[0].playerAId).toBe('p1');
    expect(stage.rounds[0].matches[0].playerBId).toBe('p4');
    expect(stage.sourceStageId).toBe('swiss-id');
  });

  it('counts tournament series wins and losses across all completed stages only', () => {
    const tournament = createEmptyTournament();
    tournament.players = players.slice(0, 3);
    tournament.stages = [{
      id: 'stage-1', name: 'Swiss', format: 'swiss', bestOf: 3, status: 'in-progress', totalRounds: 1,
      participantIds: players.slice(0, 3).map((player) => player.id),
      rounds: [{ id: 'round-1', number: 1, matches: [
        { id: 'done', playerAId: 'p1', playerBId: 'p2', scoreA: 2, scoreB: 1, winnerId: 'p1', status: 'completed' },
        { id: 'live', playerAId: 'p1', playerBId: 'p3', scoreA: 1, scoreB: 0, winnerId: null, status: 'in-progress' },
      ] }],
    }];
    const record = calculateTournamentRecords(tournament);
    expect(record.find((entry) => entry.player.id === 'p1')).toMatchObject({ wins: 1, losses: 0, seriesWins: 2, seriesLosses: 1 });
    expect(record.find((entry) => entry.player.id === 'p2')).toMatchObject({ wins: 0, losses: 1 });
    expect(record.find((entry) => entry.player.id === 'p3')).toMatchObject({ wins: 0, losses: 0 });
  });

  it('does not count goal totals as series game wins', () => {
    const tournament = createEmptyTournament();
    tournament.players = players.slice(0, 2);
    tournament.stages = [{
      id: 'goals', name: 'Final', format: 'single-elimination', bestOf: 1, scoreMode: 'goals', status: 'completed', totalRounds: 1,
      rounds: [{ id: 'r', number: 1, matches: [
        { id: 'm', playerAId: 'p1', playerBId: 'p2', scoreA: 5, scoreB: 2, winnerId: 'p1', status: 'completed' },
      ] }],
    }];
    expect(calculateTournamentRecords(tournament).find((entry) => entry.player.id === 'p1')).toMatchObject({ wins: 1, seriesWins: 0, seriesLosses: 0 });
  });
});
