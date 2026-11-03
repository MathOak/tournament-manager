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
