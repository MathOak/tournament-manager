import { applyMatchResult, calculateStandings, calculateTournamentRecords, createStage, validateMatchProgress, validateMatchResult } from './tournament-engine';
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
