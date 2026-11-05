import type { BestOf, GameId, ScoreMode } from './tournament.model';

export interface GameDefinition {
  readonly id: GameId;
  readonly label: string;
  readonly category: ScoreMode;
  readonly aliases: readonly string[];
  readonly bestOfOptions: readonly BestOf[];
}

export const GAME_CATALOG: readonly GameDefinition[] = [
  { id: 'clash-royale', label: 'Clash Royale', category: 'series-wins', aliases: ['Clash Royale'], bestOfOptions: [1, 2, 3, 5] },
  { id: 'ea-sports-fc', label: 'EA SPORTS FC', category: 'goals', aliases: ['FIFA', 'EAFC', 'EA FC', 'EA SPORTS FC'], bestOfOptions: [1, 2, 3, 5] },
];

export function gameById(id: string | undefined): GameDefinition | undefined {
  return GAME_CATALOG.find((game) => game.id === id);
}

export function gameForLegacyName(name: string): GameDefinition | undefined {
  const normalized = name.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
  return GAME_CATALOG.find((game) => [game.label, ...game.aliases]
    .some((alias) => alias.toLocaleLowerCase().replace(/[^a-z0-9]/g, '') === normalized));
}
