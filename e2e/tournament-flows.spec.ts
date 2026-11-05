import { expect, test } from '@playwright/test';

const sampleTournament = {
  schemaVersion: 1,
  id: 'e2e-cup',
  name: 'E2E Cup',
  game: 'Test Game',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  players: [
    { id: 'p1', displayName: 'Ana' },
    { id: 'p2', displayName: 'Bia' },
    { id: 'p3', displayName: 'Caio' },
    { id: 'p4', displayName: 'Duda' },
  ],
  stages: [{
    id: 'e2e-playoffs', name: 'Playoffs', format: 'single-elimination', bestOf: 3,
    status: 'in-progress', totalRounds: 2, participantIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [
      { id: 'r1', number: 1, matches: [
        { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 2, scoreB: 1, winnerId: 'p1', status: 'completed' },
        { id: 'm2', playerAId: 'p3', playerBId: 'p4', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
      ] },
      { id: 'r2', number: 2, matches: [
        { id: 'm3', playerAId: 'p1', playerBId: null, scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
      ] },
    ],
  }],
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('tournament-manager-tournaments-v1', JSON.stringify([]));
    localStorage.removeItem('tournament-manager-document-v1');
    localStorage.removeItem('tournament-manager-selected-id');
    localStorage.removeItem('tournament-manager-theme');
  });
  await page.reload();
  await expect(page.getByRole('link', { name: /Dashboard/ })).toBeVisible();
});

test('navega pelas páginas funcionais a partir do header principal', async ({ page }) => {
  await page.getByRole('link', { name: 'Jogadores' }).click();
  await expect(page.getByRole('heading', { name: 'Jogadores' })).toBeVisible();
  await page.getByRole('link', { name: 'Torneio' }).click();
  await expect(page.getByRole('heading', { name: 'Seu torneio, suas regras' })).toBeVisible();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Gerenciar partidas' })).toBeVisible();
  await page.getByRole('link', { name: 'Chaves' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
});

test('cadastra participantes e persiste após recarga', async ({ page }) => {
  await page.goto('/players');
  await page.getByLabel('Nome de exibição').fill('Ana');
  await page.getByLabel(/Nick no jogo/).fill('A#1');
  await page.getByRole('button', { name: /Adicionar à lista/ }).click();
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
});

test('importe um campeonato com chave e valida a visualização no bracket', async ({ page }) => {
  await page.goto('/players');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-cup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sampleTournament)),
  });
  await expect(page.getByText('Torneio importado com sucesso.')).toBeVisible();
  await page.getByRole('link', { name: 'Chaves' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Cup' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Semifinal' })).toBeVisible();
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tela cheia' }).click();
  await expect(page.getByRole('button', { name: 'Sair da tela cheia' })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('altera tema e navega do Admin de volta ao dashboard sem perder dados', async ({ page }) => {
  await page.goto('/players');
  await page.getByLabel('Nome de exibição').fill('Ana');
  await page.getByRole('button', { name: /Adicionar à lista/ }).click();
  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu torneio' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('confirma resultado no Admin e reflete no bracket após recarga', async ({ page }) => {
  await page.goto('/players');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-cup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sampleTournament)),
  });
  await expect(page.getByText('Torneio importado com sucesso.')).toBeVisible();
  await page.goto('/admin');
  await page.getByLabel('Vitórias na série de Caio').fill('2');
  await page.getByLabel('Vitórias na série de Duda').fill('0');
  await page.getByRole('button', { name: 'Confirmar resultado' }).click();
  await page.goto('/brackets');
  await expect(page.locator('.bracket-game.game-complete')).toHaveCount(2);
  await expect(page.getByText('FINAL').nth(1)).toBeVisible();
  await page.reload();
  await expect(page.locator('.bracket-game.game-complete')).toHaveCount(2);
  await expect(page.getByText('Caio', { exact: true })).toBeVisible();
});

test('inicia jogo de futebol em 0-0 e conclui empate com pênaltis', async ({ page }) => {
  const footballTournament = {
    schemaVersion: 2,
    id: 'football-cup',
    name: 'Copa EAFC',
    game: 'EA SPORTS FC',
    gameId: 'ea-sports-fc',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    players: [{ id: 'p1', displayName: 'Ana' }, { id: 'p2', displayName: 'Bia' }],
    stages: [{
      id: 'football-final', name: 'Final', format: 'single-elimination', bestOf: 1, scoreMode: 'goals',
      status: 'in-progress', totalRounds: 1, participantIds: ['p1', 'p2'],
      rounds: [{ id: 'r1', number: 1, matches: [
        { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
      ] }],
    }],
  };
  await page.evaluate((tournament) => {
    localStorage.setItem('tournament-manager-tournaments-v1', JSON.stringify([tournament]));
    localStorage.setItem('tournament-manager-selected-id', tournament.id);
  }, footballTournament);
  await page.reload();
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.getByText('1 ao vivo')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.live-match-card')).toContainText('0');
  await expect(page.locator('.live-card-meta')).toContainText('Gols');

  await page.goto('/admin');
  await page.getByLabel('Gols de Ana').fill('2');
  await page.getByLabel('Gols de Bia').fill('2');
  await page.getByLabel('Pênaltis de Ana').fill('4');
  await page.getByLabel('Pênaltis de Bia').fill('3');
  await page.getByRole('button', { name: 'Registrar resultado do jogo' }).click();
  await page.getByText(/Resultados encerrados nesta rodada/).click();
  await expect(page.getByText('Vencedor: Ana')).toBeVisible();
  await page.goto('/brackets');
  await expect(page.locator('.bracket-game')).toContainText('2');
  await expect(page.locator('.bracket-game')).toContainText('Pênaltis 4–3');
  await page.reload();
  await expect(page.locator('.bracket-game')).toContainText('Pênaltis 4–3');
});

test('monta uma chave eliminatória manual, salva os confrontos e avança o vencedor', async ({ page }) => {
  const manualTournament = {
    schemaVersion: 2,
    id: 'manual-bracket-cup',
    name: 'Copa Manual',
    game: 'Clash Royale',
    gameId: 'clash-royale',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    players: [
      { id: 'p1', displayName: 'Ana' },
      { id: 'p2', displayName: 'Bia' },
      { id: 'p3', displayName: 'Caio' },
      { id: 'p4', displayName: 'Duda' },
    ],
    stages: [],
  };
  await page.evaluate((tournament) => {
    localStorage.setItem('tournament-manager-tournaments-v1', JSON.stringify([tournament]));
    localStorage.setItem('tournament-manager-selected-id', tournament.id);
  }, manualTournament);
  await page.reload();
  await page.goto('/tournament');

  await page.getByRole('combobox', { name: 'Formato' }).click();
  await page.getByRole('option', { name: 'Eliminação simples' }).click();
  await page.getByRole('combobox', { name: 'Pareamento' }).click();
  await page.getByRole('option', { name: 'Montar confrontos manualmente' }).click();
  await page.getByRole('button', { name: 'Montar confrontos' }).click();

  const slots = page.locator('.manual-pairing-editor').first().locator('select');
  await slots.nth(0).selectOption('');
  await slots.nth(1).selectOption('');
  await slots.nth(2).selectOption('');
  await slots.nth(3).selectOption('');
  await slots.nth(0).selectOption({ label: 'Ana' });
  await slots.nth(1).selectOption({ label: 'Caio' });
  await slots.nth(2).selectOption({ label: 'Bia' });
  await slots.nth(3).selectOption({ label: 'Duda' });
  await page.getByRole('button', { name: 'Confirmar confrontos' }).click();

  await expect(page.locator('.stage-summary')).toHaveCount(1);
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('tournament-manager-tournaments-v1') ?? '[]');
    return saved[0]?.stages?.length === 1;
  });
  const firstRound = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('tournament-manager-tournaments-v1') ?? '[]');
    return saved[0].stages[0].rounds[0].matches.map((match: { playerAId: string; playerBId: string }) => [match.playerAId, match.playerBId]);
  });
  expect(firstRound).toEqual([['p1', 'p3'], ['p2', 'p4']]);

  await page.goto('/admin');
  await page.getByLabel('Vitórias na série de Ana').fill('2');
  await page.getByLabel('Vitórias na série de Caio').fill('0');
  await page.getByRole('button', { name: 'Confirmar resultado' }).first().click();
  await page.goto('/brackets');
  await expect(page.locator('.bracket-game.game-complete')).toHaveCount(1);
  await expect(page.locator('.bracket-game').first()).toContainText('Ana');
});

test('monta manualmente uma rodada suíça depois de concluir a rodada anterior', async ({ page }) => {
  const manualSwissTournament = {
    schemaVersion: 2,
    id: 'manual-swiss-cup',
    name: 'Suíço Manual',
    game: 'Clash Royale',
    gameId: 'clash-royale',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    players: [
      { id: 'p1', displayName: 'Ana' },
      { id: 'p2', displayName: 'Bia' },
      { id: 'p3', displayName: 'Caio' },
      { id: 'p4', displayName: 'Duda' },
    ],
    stages: [{
      id: 'manual-swiss', name: 'Sistema suíço', format: 'swiss', bestOf: 2, pairingMode: 'manual',
      status: 'in-progress', totalRounds: 2, participantIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [{ id: 'r1', number: 1, pairingMode: 'manual', matches: [
        { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 2, scoreB: 0, winnerId: 'p1', status: 'completed' },
        { id: 'm2', playerAId: 'p3', playerBId: 'p4', scoreA: 2, scoreB: 1, winnerId: 'p3', status: 'completed' },
      ] }],
    }],
  };
  await page.evaluate((tournament) => {
    localStorage.setItem('tournament-manager-tournaments-v1', JSON.stringify([tournament]));
    localStorage.setItem('tournament-manager-selected-id', tournament.id);
  }, manualSwissTournament);
  await page.reload();
  await page.goto('/tournament');
  await page.getByRole('button', { name: 'Montar próxima rodada' }).click();
  await expect(page.getByRole('region', { name: 'Montagem manual da próxima rodada suíça' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar rodada' }).click();
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('tournament-manager-tournaments-v1') ?? '[]');
    return saved[0]?.stages?.[0]?.rounds?.length === 2;
  });
  const persistedRound = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('tournament-manager-tournaments-v1') ?? '[]');
    return saved[0].stages[0].rounds[1];
  });
  expect(persistedRound.pairingMode).toBe('manual');
  expect(persistedRound.matches).toHaveLength(2);
  expect(persistedRound.matches.flatMap((match: { playerAId: string; playerBId: string }) => [match.playerAId, match.playerBId]).sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
});

test('adapta o bracket em viewport 4K e mobile sem perder navegação', async ({ page }) => {
  await page.goto('/players');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-cup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sampleTournament)),
  });
  await expect(page.getByText('Torneio importado com sucesso.')).toBeVisible();
  await page.goto('/brackets');

  await page.setViewportSize({ width: 3840, height: 2160 });
  await expect(page.locator('.bracket-board')).toBeVisible();
  const desktopSizes = await page.evaluate(() => ({
    viewportWidth: document.querySelector('.bracket-viewport')!.clientWidth,
    boardWidth: document.querySelector('.bracket-board')!.scrollWidth,
    cardHeight: document.querySelector('.bracket-game')!.getBoundingClientRect().height,
  }));
  expect(desktopSizes.boardWidth).toBeLessThanOrEqual(desktopSizes.viewportWidth + 2);
  expect(desktopSizes.cardHeight).toBeGreaterThanOrEqual(100);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await expect(page.locator('.bracket-game').first()).toBeVisible();
});
