import { TournamentStore } from './tournament-store.service';
import { createEmptyTournament } from '../domain/tournament.model';

const COLLECTION_KEY = 'tournament-manager-tournaments-v1';
const SELECTED_KEY = 'tournament-manager-selected-id';
const LEGACY_KEY = 'tournament-manager-document-v1';

async function waitForStore(store: TournamentStore): Promise<void> {
  for (let attempt = 0; attempt < 5 && !store.ready(); attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

describe('TournamentStore', () => {
  let store: TournamentStore;

  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('BroadcastChannel', undefined);
    store = new TournamentStore();
    await waitForStore(store);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('initializes an empty local tournament and exposes counts', () => {
    expect(store.ready()).toBe(true);
    expect(store.tournaments()).toHaveLength(1);
    expect(store.selectedTournamentId()).toBe(store.tournament().id);
    expect(store.playerCount()).toBe(0);
    expect(store.matchCount()).toBe(0);
  });

  it('trims tournament details and rejects blank names or game labels', () => {
    store.updateTournamentDetails('  Cup  ', '  Chess  ');
    expect(store.tournament()).toMatchObject({ name: 'Cup', game: 'Chess' });
    store.updateTournamentDetails(' ', 'Chess');
    expect(store.notice()).toContain('Informe');
    expect(store.tournament().name).toBe('Cup');
  });

  it('creates, selects and removes tournaments without losing other documents', async () => {
    const first = store.tournament();
    const second = store.createTournament();
    expect(store.tournaments()).toHaveLength(2);
    expect(store.tournament().id).toBe(second.id);
    expect(store.selectTournament(first.id)).toBe(true);
    expect(store.tournament().id).toBe(first.id);
    expect(store.selectTournament('missing')).toBe(false);
    expect(store.removeTournament(second.id)).toBe(true);
    expect(store.tournaments().map((item) => item.id)).toEqual([first.id]);
    expect(store.removeTournament(first.id)).toBe(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse(localStorage.getItem(COLLECTION_KEY) ?? '[]')).toHaveLength(1);
    expect(localStorage.getItem(SELECTED_KEY)).toBe(first.id);
  });

  it('validates player names, normalizes duplicates and prevents deleting a player used in a match', () => {
    expect(store.addPlayer('  Ana  ', '  A#1  ')).toBe(true);
    expect(store.tournament().players[0]).toMatchObject({ displayName: 'Ana', gameHandle: 'A#1' });
    expect(store.addPlayer('ana')).toBe(false);
    expect(store.addPlayer('   ')).toBe(false);
    expect(store.tournament().players).toHaveLength(1);
    store.addPlayer('Bia');
    store.addStage('single-elimination', 3, 1);
    const participantId = store.tournament().players[0].id;
    store.removePlayer(participantId);
    expect(store.tournament().players.some((player) => player.id === participantId)).toBe(true);
    expect(store.notice()).toContain('Não é possível remover');
  });

  it('requires two players to create a stage and accepts both match formats when eligible', () => {
    expect(store.addStage('swiss', 3, 3)).toBe(false);
    store.addPlayer('Ana');
    store.addPlayer('Bia');
    expect(store.addStage('swiss', 5, 2)).toBe(true);
    expect(store.tournament().stages[0]).toMatchObject({ format: 'swiss', bestOf: 5, totalRounds: 2 });
    expect(store.addStage('single-elimination', 3, 1)).toBe(true);
    expect(store.tournament().stages[1].format).toBe('single-elimination');
  });

  it('validates final and partial match scores before committing state', () => {
    store.addPlayer('Ana');
    store.addPlayer('Bia');
    store.addStage('single-elimination', 3, 1);
    const stage = store.tournament().stages[0];
    const match = stage.rounds[0].matches[0];
    expect(store.updateMatch(stage.id, 1, match.id, 1, 0)).toBe(false);
    expect(store.notice()).toContain('Placar inválido');
    expect(store.updateMatchProgress(stage.id, 1, match.id, 1, 0)).toBe(true);
    expect(store.tournament().stages[0].rounds[0].matches[0]).toMatchObject({ scoreA: 1, status: 'in-progress', winnerId: null });
    expect(store.updateMatch(stage.id, 1, match.id, 2, 0)).toBe(true);
    expect(store.tournament().stages[0].rounds[0].matches[0]).toMatchObject({ scoreA: 2, scoreB: 0, status: 'completed' });
  });

  it('generates the next Swiss round only after current matches are complete', () => {
    ['Ana', 'Bia', 'Caio', 'Duda'].forEach((name) => store.addPlayer(name));
    store.addStage('swiss', 3, 2);
    const stage = store.tournament().stages[0];
    expect(store.startNextSwissRound(stage.id)).toBe(false);
    for (const match of stage.rounds[0].matches) {
      if (match.status === 'bye') continue;
      match.status = 'completed';
      match.winnerId = match.playerAId;
      match.scoreA = 2;
    }
    expect(store.startNextSwissRound(stage.id)).toBe(true);
    expect(store.tournament().stages[0].rounds).toHaveLength(2);
    expect(store.startNextSwissRound(stage.id)).toBe(false);
  });

  it('creates an elimination stage from a completed Swiss stage without changing the source', () => {
    ['Ana', 'Bia', 'Caio', 'Duda'].forEach((name) => store.addPlayer(name));
    store.addStage('swiss', 3, 1);
    const swiss = store.tournament().stages[0];
    for (const [index, match] of swiss.rounds[0].matches.entries()) {
      match.status = 'completed';
      match.winnerId = match.playerAId;
      match.scoreA = 2;
      match.scoreB = index ? 1 : 0;
    }
    const selected = swiss.rounds[0].matches.map((match) => match.winnerId).filter((id): id is string => !!id);
    expect(store.createEliminationFromSwiss(swiss.id, selected, 'standings', selected, 5)).toBe(true);
    expect(store.tournament().stages).toHaveLength(2);
    expect(store.tournament().stages[0].id).toBe(swiss.id);
    expect(store.tournament().stages[1]).toMatchObject({ format: 'single-elimination', bestOf: 5, sourceStageId: swiss.id });
  });

  it('exports the selected tournament and imports valid JSON as a separate document', () => {
    const original = store.tournament();
    const payload = JSON.parse(store.exportJson());
    expect(payload.id).toBe(original.id);
    expect(store.importJson(JSON.stringify(payload))).toBe(true);
    expect(store.tournaments()).toHaveLength(2);
    expect(store.tournament().id).not.toBe(original.id);
    expect(store.tournament().name).toBe(original.name);
    expect(store.selectedTournamentId()).toBe(store.tournament().id);
  });

  it('rejects invalid JSON and keeps all previously loaded tournaments intact', () => {
    store.createTournament();
    const ids = store.tournaments().map((item) => item.id);
    expect(store.importJson('{invalid')).toBe(false);
    expect(store.importJson(JSON.stringify({ schemaVersion: 999 }))).toBe(false);
    expect(store.tournaments().map((item) => item.id)).toEqual(ids);
    expect(store.notice()).toContain('inválido');
  });

  it('replaces a duplicate only when replacement is explicitly requested', () => {
    const payload = JSON.parse(store.exportJson());
    payload.name = 'Versão atualizada';
    expect(store.importJson(JSON.stringify(payload))).toBe(true);
    expect(store.tournaments()).toHaveLength(2);
    expect(store.importJson(JSON.stringify(payload), true)).toBe(true);
    expect(store.tournaments()).toHaveLength(2);
    expect(store.tournament().name).toBe('Versão atualizada');
  });

  it('loads the legacy single-tournament document and migrates it to the collection fallback', async () => {
    const legacy = createEmptyTournament();
    legacy.name = 'Torneio legado';
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
    localStorage.removeItem(COLLECTION_KEY);
    const migratedStore = new TournamentStore();
    await waitForStore(migratedStore);

    expect(migratedStore.tournament().id).toBe(legacy.id);
    expect(migratedStore.tournaments()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(COLLECTION_KEY) ?? '[]')[0].name).toBe('Torneio legado');
  });
});
