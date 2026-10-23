import { applyMatchResult, calculateStandings, createStage, validateMatchResult } from './tournament-engine';
import { Match, Player } from './tournament.model';

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
});
