export type StageFormat = 'swiss' | 'single-elimination';
/** Number of games configured for a match series. New modes can be added in the game catalog. */
export type BestOf = number;
export type GameId = 'clash-royale' | 'ea-sports-fc';
export type ScoreMode = 'series-wins' | 'goals';
export type StageStatus = 'ready' | 'in-progress' | 'completed';
export type MatchStatus = 'pending' | 'in-progress' | 'completed' | 'bye';
export type SeedMode = 'standings' | 'random' | 'manual';
export type PairingMode = 'automatic' | 'manual';

export interface MatchPairing {
  playerAId: string | null;
  playerBId: string | null;
}

export interface Player {
  id: string;
  displayName: string;
  gameHandle?: string;
}

export interface Match {
  id: string;
  playerAId: string | null;
  playerBId: string | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: MatchStatus;
  penaltyScoreA?: number | null;
  penaltyScoreB?: number | null;
  gameResults?: MatchGameResult[];
}

export interface MatchGameResult {
  scoreA: number;
  scoreB: number;
  penaltyScoreA?: number | null;
  penaltyScoreB?: number | null;
  winnerId: string;
}

export interface Round {
  id: string;
  number: number;
  matches: Match[];
  pairingMode?: PairingMode;
}

export interface Stage {
  id: string;
  name: string;
  format: StageFormat;
  bestOf: BestOf;
  scoreMode?: ScoreMode;
  pairingMode?: PairingMode;
  status: StageStatus;
  rounds: Round[];
  totalRounds: number;
  participantIds?: string[];
  sourceStageId?: string;
  seedMode?: SeedMode;
}

export interface Tournament {
  schemaVersion: 1 | 2;
  id: string;
  name: string;
  game: string;
  gameId?: GameId;
  createdAt: string;
  updatedAt: string;
  players: Player[];
  stages: Stage[];
}

export function createEmptyTournament(): Tournament {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    id: createId(),
    name: 'Meu torneio',
    game: 'Clash Royale',
    gameId: 'clash-royale',
    createdAt: now,
    updatedAt: now,
    players: [],
    stages: [],
  };
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
