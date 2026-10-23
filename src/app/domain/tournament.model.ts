export type StageFormat = 'swiss' | 'single-elimination';
export type BestOf = 3 | 5;
export type StageStatus = 'ready' | 'in-progress' | 'completed';
export type MatchStatus = 'pending' | 'completed' | 'bye';

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
}

export interface Round {
  id: string;
  number: number;
  matches: Match[];
}

export interface Stage {
  id: string;
  name: string;
  format: StageFormat;
  bestOf: BestOf;
  status: StageStatus;
  rounds: Round[];
  totalRounds: number;
}

export interface Tournament {
  schemaVersion: 1;
  id: string;
  name: string;
  game: string;
  createdAt: string;
  updatedAt: string;
  players: Player[];
  stages: Stage[];
}

export function createEmptyTournament(): Tournament {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: createId(),
    name: 'Meu torneio',
    game: 'Clash Royale',
    createdAt: now,
    updatedAt: now,
    players: [],
    stages: [],
  };
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
