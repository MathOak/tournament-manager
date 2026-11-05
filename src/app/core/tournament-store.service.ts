import { Injectable, computed, signal } from '@angular/core';
import { applyGoalGameResult, applyMatchProgress, applyMatchResult, calculateStandings, createManualSwissRound, createNextSwissRound, createStage, replaceGoalGameResult, targetWins, validateEliminationPairings, validateGoalGame, validateMatchProgress, validateMatchResult, validateSwissPairings } from '../domain/tournament-engine';
import { BestOf, MatchPairing, PairingMode, Player, ScoreMode, SeedMode, StageFormat, Tournament, createEmptyTournament, createId } from '../domain/tournament.model';
import { gameById, gameForLegacyName } from '../domain/game-catalog';

const DATABASE_NAME = 'tournament-manager';
const STORE_NAME = 'documents';
const DOCUMENT_KEY = 'active-tournament';
const SELECTED_KEY = 'selected-tournament-id';
const LOCAL_FALLBACK_KEY = 'tournament-manager-document-v1';
const LOCAL_COLLECTION_KEY = 'tournament-manager-tournaments-v1';
const LOCAL_SELECTED_KEY = 'tournament-manager-selected-id';

@Injectable({ providedIn: 'root' })
export class TournamentStore {
  private readonly state = signal<Tournament>(createEmptyTournament());
  readonly tournament = this.state.asReadonly();
  readonly tournaments = signal<Tournament[]>([]);
  readonly selectedTournamentId = signal('');
  readonly playerCount = computed(() => this.state().players.length);
  readonly matchCount = computed(() => this.state().stages.reduce(
    (count, stage) => count + stage.rounds.reduce((roundCount, round) => roundCount + round.matches.length, 0), 0,
  ));
  readonly ready = signal(false);
  readonly notice = signal('');
  private channel?: BroadcastChannel;
  private database?: IDBDatabase;

  constructor() {
    this.initialize();
  }

  updateTournamentDetails(name: string, game: string): boolean {
    const cleanName = name.trim();
    const selectedGame = gameById(game) ?? gameForLegacyName(game);
    const current = this.state();
    const keepLegacyGame = current.stages.length > 0 && !current.gameId && current.game === game.trim();
    if (!cleanName || (!selectedGame && !keepLegacyGame)) {
      this.notice.set('Informe o nome do torneio e selecione um jogo da lista.');
      return false;
    }
    if (current.stages.length && current.gameId && current.game !== selectedGame?.label) {
      this.notice.set('Não é possível trocar o jogo depois que etapas foram criadas.');
      return false;
    }
    this.commit((tournament) => ({
      ...tournament,
      name: cleanName,
      game: selectedGame?.label ?? tournament.game,
      gameId: selectedGame?.id ?? tournament.gameId,
    }));
    return true;
  }

  createTournament(): Tournament {
    const tournament = createEmptyTournament();
    const suffix = this.tournaments().length + 1;
    tournament.name = `Meu torneio ${suffix}`;
    tournament.game = '';
    tournament.gameId = undefined;
    this.tournaments.update((items) => [...items, tournament]);
    this.state.set(tournament);
    this.selectedTournamentId.set(tournament.id);
    this.notice.set('Novo campeonato criado. Configure o nome e o jogo.');
    void this.persistCollection();
    return tournament;
  }

  selectTournament(tournamentId: string): boolean {
    const selected = this.tournaments().find((item) => item.id === tournamentId);
    if (!selected) return false;
    this.state.set(selected);
    this.selectedTournamentId.set(selected.id);
    this.notice.set('');
    void this.persistCollection();
    return true;
  }

  removeTournament(tournamentId: string): boolean {
    const items = this.tournaments();
    if (items.length <= 1 || !items.some((item) => item.id === tournamentId)) return false;
    const remaining = items.filter((item) => item.id !== tournamentId);
    this.tournaments.set(remaining);
    if (this.selectedTournamentId() === tournamentId) {
      this.state.set(remaining[0]);
      this.selectedTournamentId.set(remaining[0].id);
    }
    void this.persistCollection();
    return true;
  }

  addPlayer(displayName: string, gameHandle = ''): boolean {
    const cleanName = displayName.trim();
    const normalized = cleanName.toLocaleLowerCase();
    if (!cleanName || this.state().players.some((player) => player.displayName.toLocaleLowerCase() === normalized)) {
      this.notice.set(cleanName ? 'Já existe um jogador com esse nome.' : 'O nome do jogador é obrigatório.');
      return false;
    }
    const player: Player = { id: createId(), displayName: cleanName };
    if (gameHandle.trim()) player.gameHandle = gameHandle.trim();
    this.commit((current) => ({ ...current, players: [...current.players, player] }));
    return true;
  }

  removePlayer(playerId: string): void {
    const current = this.state();
    if (current.stages.some((stage) => stage.rounds.some((round) => round.matches.some(
      (match) => match.playerAId === playerId || match.playerBId === playerId,
    )))) {
      this.notice.set('Não é possível remover jogadores que já estão em uma chave.');
      return;
    }
    this.commit((tournament) => ({ ...tournament, players: tournament.players.filter((player) => player.id !== playerId) }));
  }

  addStage(format: StageFormat, bestOf: BestOf, rounds: number, pairingMode: PairingMode = 'automatic', initialPairings?: MatchPairing[]): boolean {
    const current = this.state();
    const game = gameById(current.gameId) ?? gameForLegacyName(current.game);
    if (!game) {
      this.notice.set('Selecione um jogo compatível antes de criar uma etapa.');
      return false;
    }
    if (!game.bestOfOptions.includes(bestOf)) {
      this.notice.set(`O jogo ${game.label} não oferece o formato MD${bestOf}.`);
      return false;
    }
    if (current.players.length < 2) {
      this.notice.set('Cadastre pelo menos dois jogadores antes de criar uma chave.');
      return false;
    }
    if (pairingMode === 'manual') {
      const error = format === 'single-elimination'
        ? validateEliminationPairings(current.players.map((player) => player.id), initialPairings ?? [])
        : validateSwissPairings({
            id: 'draft', name: 'Rascunho suíço', format: 'swiss', bestOf, scoreMode: game.category,
            pairingMode, status: 'ready', rounds: [], totalRounds: Math.max(1, rounds),
            participantIds: current.players.map((player) => player.id),
          }, current.players, initialPairings ?? []);
      if (error) {
        this.notice.set(error);
        return false;
      }
    }
    const stage = createStage(current.players, format, bestOf, rounds, undefined, {
      scoreMode: game.category,
      pairingMode,
      ...(pairingMode === 'manual' ? { initialPairings } : {}),
    });
    this.commit((tournament) => ({ ...tournament, stages: [...tournament.stages, stage] }));
    return true;
  }

  createEliminationFromSwiss(sourceStageId: string, selectedIds: string[], seedMode: SeedMode, manualOrder: string[], bestOf: BestOf, pairingMode: PairingMode = 'automatic', initialPairings?: MatchPairing[]): boolean {
    const tournament = this.state();
    const source = tournament.stages.find((stage) => stage.id === sourceStageId && stage.format === 'swiss');
    if (!source || source.rounds.length < source.totalRounds || source.rounds.some((round) => round.matches.some((match) => match.status === 'pending' || match.status === 'in-progress'))) {
      this.notice.set('Conclua todas as rodadas suíças antes de classificar jogadores.');
      return false;
    }
    const eligibleIds = new Set(source.participantIds ?? tournament.players.map((player) => player.id));
    const qualified = [...new Set(selectedIds)].filter((id) => eligibleIds.has(id)).map((id) => tournament.players.find((player) => player.id === id)).filter((player): player is Player => !!player);
    if (qualified.length < 2) {
      this.notice.set('Selecione pelo menos dois classificados para a eliminatória.');
      return false;
    }
    if (pairingMode === 'manual') {
      const error = validateEliminationPairings(qualified.map((player) => player.id), initialPairings ?? []);
      if (error) {
        this.notice.set(error);
        return false;
      }
    }
    let seedOrder: string[] | undefined;
    if (seedMode === 'standings') {
      const standings = calculateStandings(source, tournament.players);
      seedOrder = standings.map((standing) => standing.player.id).filter((id) => qualified.some((player) => player.id === id));
    } else if (seedMode === 'manual') {
      seedOrder = manualOrder.filter((id) => qualified.some((player) => player.id === id));
      for (const player of qualified) if (!seedOrder.includes(player.id)) seedOrder.push(player.id);
    } else {
      seedOrder = manualOrder.filter((id) => qualified.some((player) => player.id === id));
      for (const player of qualified) if (!seedOrder.includes(player.id)) seedOrder.push(player.id);
    }
    const stage = createStage(qualified, 'single-elimination', bestOf, 1, 'Eliminação simples', {
      ...(seedOrder ? { seedOrder } : {}),
      sourceStageId,
      seedMode,
      scoreMode: source.scoreMode ?? 'series-wins',
      pairingMode,
      ...(pairingMode === 'manual' ? { initialPairings } : {}),
    });
    this.commit((current) => ({ ...current, stages: [...current.stages, stage] }));
    return true;
  }

  removeStage(stageId: string): void {
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.filter((stage) => stage.id !== stageId),
    }));
  }

  startNextSwissRound(stageId: string): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    if (stage?.pairingMode === 'manual') {
      this.notice.set('Esta etapa usa pareamento manual. Monte e confirme os confrontos da próxima rodada.');
      return false;
    }
    if (!stage || stage.format !== 'swiss' || stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending' || match.status === 'in-progress'))) {
      this.notice.set('Conclua todas as partidas da rodada atual antes de gerar a próxima.');
      return false;
    }
    const nextRound = createNextSwissRound(stage, current.players);
    if (!nextRound) {
      this.notice.set('Todas as rodadas suíças configuradas já foram geradas.');
      return false;
    }
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId ? { ...item, status: 'in-progress', rounds: [...item.rounds, nextRound] } : item),
    }));
    return true;
  }

  startManualSwissRound(stageId: string, pairings: MatchPairing[]): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    if (!stage || stage.format !== 'swiss' || stage.rounds.length >= stage.totalRounds ||
        stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending' || match.status === 'in-progress'))) {
      this.notice.set('Conclua todas as partidas da rodada atual antes de configurar a próxima.');
      return false;
    }
    const round = createManualSwissRound(stage, current.players, pairings);
    if (!round) {
      this.notice.set(validateSwissPairings(stage, current.players, pairings) ?? 'Não foi possível criar a rodada manual.');
      return false;
    }
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId
        ? { ...item, pairingMode: 'manual' as const, status: 'in-progress' as const, rounds: [...item.rounds, round] }
        : item),
    }));
    return true;
  }

  updateMatch(stageId: string, roundNumber: number, matchId: string, scoreA: number, scoreB: number, penaltyScoreA: number | null = null, penaltyScoreB: number | null = null): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    const match = stage?.rounds.find((round) => round.number === roundNumber)?.matches.find((item) => item.id === matchId);
    if (!stage || !match) return false;
    const result = validateMatchResult(match, stage.bestOf, scoreA, scoreB, stage.scoreMode ?? 'series-wins', penaltyScoreA, penaltyScoreB);
    if (!result) {
      this.notice.set(stage.scoreMode === 'goals'
        ? 'Resultado inválido. Informe gols diferentes ou, em caso de empate, um placar de pênaltis que defina o vencedor.'
        : `Placar inválido. Em MD${stage.bestOf}, alguém precisa alcançar ${stage.bestOf === 1 ? 1 : stage.bestOf === 5 ? 3 : 2} vitória(s).`);
      return false;
    }
    const updatedStage = applyMatchResult(stage, roundNumber, matchId, result);
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId ? updatedStage : item),
    }));
    return true;
  }

  recordGoalGame(stageId: string, roundNumber: number, matchId: string, scoreA: number, scoreB: number, penaltyScoreA: number | null = null, penaltyScoreB: number | null = null): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    const match = stage?.rounds.find((round) => round.number === roundNumber)?.matches.find((item) => item.id === matchId);
    if (!stage || stage.scoreMode !== 'goals' || !match || match.status === 'completed' || match.status === 'bye') {
      this.notice.set('Esta partida não aceita um novo resultado de gols.');
      return false;
    }
    const maxGames = targetWins(stage.bestOf) * 2 - 1;
    if ((match.gameResults?.length ?? 0) >= maxGames) {
      this.notice.set('A série já atingiu o limite de partidas permitido.');
      return false;
    }
    const result = validateGoalGame(match, scoreA, scoreB, penaltyScoreA, penaltyScoreB);
    if (!result) {
      this.notice.set('Resultado inválido. Informe gols diferentes ou, em caso de empate, pênaltis que definam o vencedor.');
      return false;
    }
    const updatedStage = applyGoalGameResult(stage, roundNumber, matchId, result);
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId ? updatedStage : item),
    }));
    return true;
  }

  correctGoalGame(stageId: string, roundNumber: number, matchId: string, gameIndex: number, scoreA: number, scoreB: number, penaltyScoreA: number | null = null, penaltyScoreB: number | null = null): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    const match = stage?.rounds.find((round) => round.number === roundNumber)?.matches.find((item) => item.id === matchId);
    if (!stage || stage.scoreMode !== 'goals' || !match || match.status !== 'completed') {
      this.notice.set('Somente uma série de gols concluída pode ter seu jogo corrigido.');
      return false;
    }
    const result = validateGoalGame(match, scoreA, scoreB, penaltyScoreA, penaltyScoreB);
    if (!result || gameIndex < 0 || gameIndex >= (match.gameResults?.length ?? 0)) {
      this.notice.set('Resultado inválido para corrigir o jogo.');
      return false;
    }
    const updatedStage = replaceGoalGameResult(stage, roundNumber, matchId, gameIndex, result);
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId ? updatedStage : item),
    }));
    return true;
  }

  updateMatchProgress(stageId: string, roundNumber: number, matchId: string, scoreA: number, scoreB: number): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    const match = stage?.rounds.find((round) => round.number === roundNumber)?.matches.find((item) => item.id === matchId);
    if (!stage || !match || match.status === 'completed' || !validateMatchProgress(match, stage.bestOf, scoreA, scoreB, stage.scoreMode ?? 'series-wins')) {
      this.notice.set('Placar parcial inválido. Não confirme uma série encerrada como parcial.');
      return false;
    }
    const updatedStage = applyMatchProgress(stage, roundNumber, matchId, scoreA, scoreB);
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId ? updatedStage : item),
    }));
    return true;
  }

  startMatch(stageId: string, roundNumber: number, matchId: string): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    const match = stage?.rounds.find((round) => round.number === roundNumber)?.matches.find((item) => item.id === matchId);
    if (!stage || !match || match.status !== 'pending' || !match.playerAId || !match.playerBId) {
      this.notice.set('Só é possível iniciar uma partida pendente com dois participantes definidos.');
      return false;
    }
    const updatedStage = applyMatchProgress(stage, roundNumber, matchId, 0, 0);
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId ? updatedStage : item),
    }));
    return true;
  }

  exportJson(): string {
    return JSON.stringify(this.state(), null, 2);
  }

  importJson(json: string, replaceExisting = false): boolean {
    try {
      const parsed: unknown = JSON.parse(json);
      const migrated = migrateTournament(parsed);
      if (!migrated) throw new Error('Formato inválido');
      const imported: Tournament = migrated;
      const duplicate = this.tournaments().some((item) => item.id === imported.id);
      const replaceDuplicate = duplicate && replaceExisting;
      if (duplicate && !replaceDuplicate) imported.id = createId();
      imported.updatedAt = new Date().toISOString();
      this.tournaments.update((items) => replaceDuplicate
        ? items.map((item) => item.id === imported.id ? imported : item)
        : [...items, imported]);
      this.state.set(imported);
      this.selectedTournamentId.set(imported.id);
      this.notice.set('Torneio importado com sucesso.');
      void this.persistCollection();
      return true;
    } catch {
      this.notice.set('Arquivo JSON inválido ou versão não suportada. Os dados atuais foram mantidos.');
      return false;
    }
  }

  clearAll(): void {
    const empty = createEmptyTournament();
    this.tournaments.set([empty]);
    this.state.set(empty);
    this.selectedTournamentId.set(empty.id);
    this.notice.set('Todos os jogadores e torneios foram removidos.');
    void this.persistCollection();
  }

  dismissNotice(): void {
    this.notice.set('');
  }

  private initialize(): void {
    if (typeof indexedDB !== 'undefined') {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => {
        this.database = request.result;
        void this.load();
      };
      request.onerror = () => void this.loadFallback();
    } else {
      void this.loadFallback();
    }
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('tournament-manager-updates');
      this.channel.onmessage = () => void this.load();
    }
  }

  private async load(): Promise<void> {
    try {
      const values = await this.readAllFromDatabase();
      let tournaments = uniqueTournaments(values.map(migrateTournament).filter((item): item is Tournament => !!item));
      let selectedId = await this.readSelectedId();
      if (!tournaments.length) {
        const fallback = this.readFallbackCollection();
        tournaments = fallback.tournaments;
        selectedId ||= fallback.selectedId;
      }
      if (!tournaments.length) tournaments = [createEmptyTournament()];
      const selected = tournaments.find((item) => item.id === selectedId) ?? tournaments[0];
      this.tournaments.set(tournaments);
      this.selectedTournamentId.set(selected.id);
      this.state.set(selected);
      await this.persistCollection(false);
    } catch {
      await this.loadFallback();
    } finally {
      this.ready.set(true);
    }
  }

  private async loadFallback(): Promise<void> {
    try {
      const fallback = this.readFallbackCollection();
      const tournaments = fallback.tournaments.length ? fallback.tournaments : [createEmptyTournament()];
      const selected = tournaments.find((item) => item.id === fallback.selectedId) ?? tournaments[0];
      this.tournaments.set(tournaments);
      this.selectedTournamentId.set(selected.id);
      this.state.set(selected);
      await this.persistCollection(false);
    } catch {
      this.notice.set('Não foi possível carregar os dados locais salvos.');
    } finally {
      this.ready.set(true);
    }
  }

  private commit(updater: (current: Tournament) => Tournament): void {
    const updated = updater(this.state());
    updated.updatedAt = new Date().toISOString();
    this.state.set(updated);
    this.tournaments.update((items) => items.some((item) => item.id === updated.id)
      ? items.map((item) => item.id === updated.id ? updated : item)
      : [...items, updated]);
    this.selectedTournamentId.set(updated.id);
    this.notice.set('');
    void this.persistCollection();
  }

  private async persistCollection(notifyOtherTabs = true): Promise<void> {
    try {
      if (!this.database && typeof indexedDB !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(DATABASE_NAME, 1);
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
          };
          request.onsuccess = () => { this.database = request.result; resolve(); };
          request.onerror = () => reject(request.error);
        });
      }
      if (this.database) {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.database!.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.clear();
          for (const tournament of this.tournaments()) store.put(tournament, tournament.id);
          store.put(this.selectedTournamentId(), SELECTED_KEY);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      }
      const selected = this.tournaments().find((item) => item.id === this.selectedTournamentId()) ?? this.state();
      localStorage.setItem(LOCAL_COLLECTION_KEY, JSON.stringify(this.tournaments()));
      localStorage.setItem(LOCAL_SELECTED_KEY, selected.id);
      localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(selected));
      if (notifyOtherTabs) this.channel?.postMessage({ type: 'updated' });
    } catch {
      this.notice.set('Não foi possível salvar no navegador. Exporte uma cópia de segurança.');
    }
  }

  private readAllFromDatabase(): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      if (!this.database) return resolve([]);
      const request = this.database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private readSelectedId(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.database) return resolve('');
      const request = this.database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(SELECTED_KEY);
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : '');
      request.onerror = () => reject(request.error);
    });
  }

  private readFallbackCollection(): { tournaments: Tournament[]; selectedId: string } {
    try {
      const rawCollection = localStorage.getItem(LOCAL_COLLECTION_KEY);
      const parsedCollection: unknown = rawCollection ? JSON.parse(rawCollection) : [];
      const tournaments = Array.isArray(parsedCollection) ? uniqueTournaments(parsedCollection.map(migrateTournament).filter((item): item is Tournament => !!item)) : [];
      if (tournaments.length) return { tournaments, selectedId: localStorage.getItem(LOCAL_SELECTED_KEY) ?? '' };
      const rawLegacy = localStorage.getItem(LOCAL_FALLBACK_KEY);
      const legacy: unknown = rawLegacy ? JSON.parse(rawLegacy) : null;
      const migratedLegacy = migrateTournament(legacy);
      return { tournaments: migratedLegacy ? [migratedLegacy] : [], selectedId: migratedLegacy?.id ?? '' };
    } catch {
      return { tournaments: [], selectedId: '' };
    }
  }
}

function migrateTournament(value: unknown): Tournament | null {
  if (!isTournament(value)) return null;
  const game = gameForLegacyName(value.game);
  return {
    ...value,
    schemaVersion: 2,
    gameId: value.gameId ?? game?.id,
    stages: value.stages.map((stage) => ({ ...stage, scoreMode: stage.scoreMode ?? 'series-wins' })),
  };
}

function isTournament(value: unknown): value is Tournament {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Tournament>;
  return (candidate.schemaVersion === 1 || candidate.schemaVersion === 2) && typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' && typeof candidate.game === 'string' &&
    (candidate.gameId === undefined || candidate.gameId === 'clash-royale' || candidate.gameId === 'ea-sports-fc') &&
    typeof candidate.createdAt === 'string' && typeof candidate.updatedAt === 'string' &&
    Array.isArray(candidate.players) && Array.isArray(candidate.stages) &&
    candidate.players.every((player) => typeof player.id === 'string' && typeof player.displayName === 'string') &&
    candidate.stages.every((stage) => {
      if (!stage || typeof stage !== 'object') return false;
      const item = stage as Partial<Tournament['stages'][number]>;
      return typeof item.id === 'string' && typeof item.name === 'string' &&
        (item.format === 'swiss' || item.format === 'single-elimination') &&
        (item.pairingMode === undefined || item.pairingMode === 'automatic' || item.pairingMode === 'manual') &&
        typeof item.bestOf === 'number' && Number.isInteger(item.bestOf) && item.bestOf > 0 && item.bestOf <= 15 && Array.isArray(item.rounds) &&
        (item.scoreMode === undefined || item.scoreMode === 'series-wins' || item.scoreMode === 'goals') &&
        (item.scoreMode !== 'goals' || item.bestOf === 1) &&
        item.rounds.every((round) => !!round && typeof round.id === 'string' &&
          Number.isInteger(round.number) && Array.isArray(round.matches) &&
          (round.pairingMode === undefined || round.pairingMode === 'automatic' || round.pairingMode === 'manual') &&
          round.matches.every((match) => !!match && typeof match.id === 'string' &&
            (match.playerAId === null || typeof match.playerAId === 'string') &&
            (match.playerBId === null || typeof match.playerBId === 'string') &&
            Number.isInteger(match.scoreA) && Number.isInteger(match.scoreB) &&
            (match.penaltyScoreA === undefined || match.penaltyScoreA === null || Number.isInteger(match.penaltyScoreA)) &&
            (match.penaltyScoreB === undefined || match.penaltyScoreB === null || Number.isInteger(match.penaltyScoreB)) &&
            ((match.penaltyScoreA === undefined || match.penaltyScoreA === null) === (match.penaltyScoreB === undefined || match.penaltyScoreB === null)) &&
            (match.gameResults === undefined || (Array.isArray(match.gameResults) && match.gameResults.every((game) => isValidGameResult(game, match.playerAId, match.playerBId)))) &&
            (match.winnerId === null || typeof match.winnerId === 'string') &&
            (match.status === 'pending' || match.status === 'in-progress' || match.status === 'completed' || match.status === 'bye')));
    });
}

function isValidGameResult(value: unknown, playerAId: string | null, playerBId: string | null): boolean {
  if (!value || typeof value !== 'object') return false;
  const game = value as { scoreA?: unknown; scoreB?: unknown; penaltyScoreA?: unknown; penaltyScoreB?: unknown; winnerId?: unknown };
  const hasPenaltyA = game.penaltyScoreA !== undefined && game.penaltyScoreA !== null;
  const hasPenaltyB = game.penaltyScoreB !== undefined && game.penaltyScoreB !== null;
  if (!Number.isInteger(game.scoreA) || !Number.isInteger(game.scoreB) || (game.scoreA as number) < 0 || (game.scoreB as number) < 0 ||
      (typeof game.winnerId !== 'string' || (game.winnerId !== playerAId && game.winnerId !== playerBId)) || hasPenaltyA !== hasPenaltyB) return false;
  if (!hasPenaltyA) return game.scoreA !== game.scoreB && game.winnerId === ((game.scoreA as number) > (game.scoreB as number) ? playerAId : playerBId);
  return Number.isInteger(game.penaltyScoreA) && Number.isInteger(game.penaltyScoreB) &&
    (game.penaltyScoreA as number) >= 0 && (game.penaltyScoreB as number) >= 0 && game.scoreA === game.scoreB &&
    game.penaltyScoreA !== game.penaltyScoreB &&
    game.winnerId === ((game.penaltyScoreA as number) > (game.penaltyScoreB as number) ? playerAId : playerBId);
}

function uniqueTournaments(tournaments: Tournament[]): Tournament[] {
  return [...new Map(tournaments.map((tournament) => [tournament.id, tournament])).values()];
}
