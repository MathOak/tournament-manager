import { Injectable, computed, signal } from '@angular/core';
import { applyMatchResult, createNextSwissRound, createStage, validateMatchResult } from '../domain/tournament-engine';
import { BestOf, Player, StageFormat, Tournament, createEmptyTournament, createId } from '../domain/tournament.model';

const DATABASE_NAME = 'tournament-manager';
const STORE_NAME = 'documents';
const DOCUMENT_KEY = 'active-tournament';
const LOCAL_FALLBACK_KEY = 'tournament-manager-document-v1';

@Injectable({ providedIn: 'root' })
export class TournamentStore {
  private readonly state = signal<Tournament>(createEmptyTournament());
  readonly tournament = this.state.asReadonly();
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

  updateTournamentDetails(name: string, game: string): void {
    const cleanName = name.trim();
    const cleanGame = game.trim();
    if (!cleanName || !cleanGame) {
      this.notice.set('Informe o nome do torneio e do jogo.');
      return;
    }
    this.commit((current) => ({ ...current, name: cleanName, game: cleanGame }));
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

  addStage(format: StageFormat, bestOf: BestOf, rounds: number): boolean {
    const current = this.state();
    if (current.players.length < 2) {
      this.notice.set('Cadastre pelo menos dois jogadores antes de criar uma chave.');
      return false;
    }
    const stage = createStage(current.players, format, bestOf, rounds);
    this.commit((tournament) => ({ ...tournament, stages: [...tournament.stages, stage] }));
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
    if (!stage || stage.format !== 'swiss' || stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending'))) {
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

  updateMatch(stageId: string, roundNumber: number, matchId: string, scoreA: number, scoreB: number): boolean {
    const current = this.state();
    const stage = current.stages.find((item) => item.id === stageId);
    const match = stage?.rounds.find((round) => round.number === roundNumber)?.matches.find((item) => item.id === matchId);
    if (!stage || !match) return false;
    const result = validateMatchResult(match, stage.bestOf, scoreA, scoreB);
    if (!result) {
      this.notice.set(`Placar inválido. Em MD${stage.bestOf}, alguém precisa alcançar ${stage.bestOf === 3 ? 2 : 3} vitórias.`);
      return false;
    }
    const updatedStage = applyMatchResult(stage, roundNumber, matchId, result);
    this.commit((tournament) => ({
      ...tournament,
      stages: tournament.stages.map((item) => item.id === stageId ? updatedStage : item),
    }));
    return true;
  }

  exportJson(): string {
    return JSON.stringify(this.state(), null, 2);
  }

  importJson(json: string): boolean {
    try {
      const parsed: unknown = JSON.parse(json);
      if (!isTournament(parsed)) throw new Error('Formato inválido');
      parsed.updatedAt = new Date().toISOString();
      this.state.set(parsed);
      this.notice.set('Torneio importado com sucesso.');
      void this.persist(parsed);
      return true;
    } catch {
      this.notice.set('Arquivo JSON inválido ou versão não suportada. Os dados atuais foram mantidos.');
      return false;
    }
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
      const value = await this.readFromDatabase();
      if (isTournament(value)) this.state.set(value);
      else await this.loadFallback();
    } catch {
      await this.loadFallback();
    } finally {
      this.ready.set(true);
    }
  }

  private async loadFallback(): Promise<void> {
    try {
      const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
      if (raw) {
        const value: unknown = JSON.parse(raw);
        if (isTournament(value)) this.state.set(value);
      }
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
    this.notice.set('');
    void this.persist(updated);
  }

  private async persist(tournament: Tournament): Promise<void> {
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
          transaction.objectStore(STORE_NAME).put(tournament, DOCUMENT_KEY);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      }
      localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(tournament));
      this.channel?.postMessage({ type: 'updated' });
    } catch {
      this.notice.set('Não foi possível salvar no navegador. Exporte uma cópia de segurança.');
    }
  }

  private readFromDatabase(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.database) return resolve(null);
      const request = this.database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DOCUMENT_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

function isTournament(value: unknown): value is Tournament {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Tournament>;
  return candidate.schemaVersion === 1 && typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' && typeof candidate.game === 'string' &&
    typeof candidate.createdAt === 'string' && typeof candidate.updatedAt === 'string' &&
    Array.isArray(candidate.players) && Array.isArray(candidate.stages) &&
    candidate.players.every((player) => typeof player.id === 'string' && typeof player.displayName === 'string') &&
    candidate.stages.every((stage) => {
      if (!stage || typeof stage !== 'object') return false;
      const item = stage as Partial<Tournament['stages'][number]>;
      return typeof item.id === 'string' && typeof item.name === 'string' &&
        (item.format === 'swiss' || item.format === 'single-elimination') &&
        (item.bestOf === 3 || item.bestOf === 5) && Array.isArray(item.rounds) &&
        item.rounds.every((round) => !!round && typeof round.id === 'string' &&
          Number.isInteger(round.number) && Array.isArray(round.matches) &&
          round.matches.every((match) => !!match && typeof match.id === 'string' &&
            (match.playerAId === null || typeof match.playerAId === 'string') &&
            (match.playerBId === null || typeof match.playerBId === 'string') &&
            Number.isInteger(match.scoreA) && Number.isInteger(match.scoreB) &&
            (match.winnerId === null || typeof match.winnerId === 'string') &&
            (match.status === 'pending' || match.status === 'completed' || match.status === 'bye')));
    });
}
