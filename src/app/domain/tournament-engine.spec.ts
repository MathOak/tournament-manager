import { applyMatchProgress, applyMatchResult, calculateStandings, calculateTournamentRecords, createNextSwissRound, createStage, validateMatchProgress, validateMatchResult } from './tournament-engine';
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

  it('accepts partial MD3/MD5 series scores without counting them as a completed match', () => {
    expect(validateMatchProgress(pendingMatch(), 3, 1, 0)).toBe(true);
    expect(validateMatchProgress(pendingMatch(), 5, 2, 1)).toBe(true);
    expect(validateMatchProgress(pendingMatch(), 3, 2, 0)).toBe(false);
    expect(validateMatchProgress(pendingMatch(), 5, 3, 3)).toBe(false);
    expect(validateMatchProgress(pendingMatch(), 3, 0, 0)).toBe(false);
  });

  it('creates a Swiss first round and standings with a bye for odd participant counts', () => {
    const stage = createStage(players.slice(0, 3), 'swiss', 3, 3);
    expect(stage.rounds[0].matches).toHaveLength(2);
    expect(stage.rounds[0].matches.filter((match) => match.status === 'bye')).toHaveLength(1);
    expect(calculateStandings(stage, players.slice(0, 3)).filter((standing) => standing.points === 1)).toHaveLength(1);
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
});
