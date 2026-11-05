import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BestOf, Match, Stage } from '../../domain/tournament.model';
import { targetWins as getTargetWins } from '../../domain/tournament-engine';
import { TournamentStore } from '../../core/tournament-store.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeadingComponent } from '../../shared/ui/page-heading/page-heading.component';
import { SelectMenuComponent, SelectMenuOption } from '../../shared/ui/select-menu/select-menu.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink, EmptyStateComponent, PageHeadingComponent, SelectMenuComponent],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly store = inject(TournamentStore);
  readonly drafts: Record<string, { scoreA: number; scoreB: number; gameScoreA: number; gameScoreB: number; gameResultIndex: number | null; penaltyScoreA: number | null; penaltyScoreB: number | null }> = {};
  readonly editingMatches = new Set<string>();
  readonly selectedStageId = signal('');
  readonly selectedRoundNumber = signal(0);
  readonly activeStage = computed(() => {
    const stages = this.store.tournament().stages;
    return stages.find((stage) => stage.id === this.selectedStageId()) ?? stages.find((stage) => stage.status !== 'completed') ?? stages[0] ?? null;
  });
  readonly currentRound = computed(() => {
    const stage = this.activeStage();
    if (!stage) return null;
    if (this.selectedRoundNumber()) return stage.rounds.find((round) => round.number === this.selectedRoundNumber()) ?? null;
    return stage.rounds.find((round) => round.matches.some((match) =>
      (match.status === 'pending' || match.status === 'in-progress') && match.playerAId && match.playerBId,
    )) ?? stage.rounds.at(-1) ?? null;
  });
  readonly openCount = computed(() => this.activeStage()?.rounds.reduce((count, round) => count + round.matches.filter((match) => match.status === 'pending' || match.status === 'in-progress').length, 0) ?? 0);
  readonly liveCount = computed(() => this.activeStage()?.rounds.reduce((count, round) => count + round.matches.filter((match) => match.status === 'in-progress').length, 0) ?? 0);
  readonly completedCount = computed(() => this.activeStage()?.rounds.reduce((count, round) => count + round.matches.filter((match) => match.status === 'completed').length, 0) ?? 0);

  readonly tournamentOptions = computed<SelectMenuOption[]>(() => this.store.tournaments().map((item) => ({
    value: item.id,
    title: item.name,
    subtitle: item.game || undefined,
  })));
  readonly stageOptions = computed<SelectMenuOption[]>(() => this.store.tournament().stages.map((stage) => ({ value: stage.id, title: stage.name })));

  selectTournament(tournamentId: string): void {
    if (tournamentId === this.store.selectedTournamentId() || !this.store.selectTournament(tournamentId)) return;
    this.resetLocalState();
  }

  createTournament(): void {
    this.store.createTournament();
    this.resetLocalState();
  }

  removeTournament(): void {
    const current = this.store.tournament();
    if (this.store.tournaments().length <= 1) {
      this.store.notice.set('Mantenha pelo menos um campeonato. Use "Limpar dados" para zerar o sistema.');
      return;
    }
    if (!confirm(`Excluir o campeonato "${current.name}"? Esta ação não pode ser desfeita.`)) return;
    if (this.store.removeTournament(current.id)) this.resetLocalState();
  }

  exportTournament(): void {
    const current = this.store.tournament();
    const slug = current.name.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campeonato';
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
    const url = URL.createObjectURL(new Blob([this.store.exportJson()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `torneio-${slug}-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async importTournament(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const json = await file.text();
    let replace = false;
    try {
      const id = (JSON.parse(json) as { id?: unknown }).id;
      if (this.store.tournaments().some((item) => item.id === id)) {
        replace = confirm('Já existe um campeonato com este identificador. OK para substituir, Cancelar para importar como cópia.');
      }
    } catch { /* o store informa JSON inválido */ }
    if (this.store.importJson(json, replace)) this.resetLocalState();
  }

  clearAll(): void {
    if (!confirm('Apagar TODOS os jogadores e campeonatos deste navegador? Exporte uma cópia antes. Esta ação não pode ser desfeita.')) return;
    if (prompt('Digite LIMPAR para confirmar.') !== 'LIMPAR') return;
    this.store.clearAll();
    this.resetLocalState();
  }

  private resetLocalState(): void {
    this.selectedStageId.set('');
    this.selectedRoundNumber.set(0);
    for (const key of Object.keys(this.drafts)) delete this.drafts[key];
    this.editingMatches.clear();
  }

  selectStage(stageId: string): void {
    this.selectedStageId.set(stageId);
    this.selectedRoundNumber.set(0);
  }

  selectRound(roundNumber: number): void {
    this.selectedRoundNumber.set(roundNumber);
  }

  playerName(playerId: string | null): string {
    return this.store.tournament().players.find((player) => player.id === playerId)?.displayName ?? 'Aguardando jogador';
  }

  draft(match: Match): { scoreA: number; scoreB: number; gameScoreA: number; gameScoreB: number; gameResultIndex: number | null; penaltyScoreA: number | null; penaltyScoreB: number | null } {
    return this.drafts[match.id] ??= {
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      gameScoreA: 0,
      gameScoreB: 0,
      gameResultIndex: null,
      penaltyScoreA: match.gameResults?.at(-1)?.penaltyScoreA ?? match.penaltyScoreA ?? null,
      penaltyScoreB: match.gameResults?.at(-1)?.penaltyScoreB ?? match.penaltyScoreB ?? null,
    };
  }

  saveResult(stage: Stage, roundNumber: number, match: Match): void {
    const result = this.draft(match);
    const saved = stage.scoreMode === 'goals'
      ? result.gameResultIndex !== null
        ? this.store.correctGoalGame(stage.id, roundNumber, match.id, result.gameResultIndex, Number(result.gameScoreA), Number(result.gameScoreB), result.penaltyScoreA, result.penaltyScoreB)
        : this.store.recordGoalGame(stage.id, roundNumber, match.id, Number(result.gameScoreA), Number(result.gameScoreB), result.penaltyScoreA, result.penaltyScoreB)
      : this.store.updateMatch(stage.id, roundNumber, match.id, Number(result.scoreA), Number(result.scoreB), result.penaltyScoreA, result.penaltyScoreB);
    if (saved) {
      delete this.drafts[match.id];
      this.editingMatches.delete(match.id);
    }
  }

  beginCorrection(match: Match): void {
    if (!confirm('Corrigir este resultado pode alterar os jogadores que avançaram na chave. Continuar?')) return;
    this.editingMatches.add(match.id);
    this.drafts[match.id] = {
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      gameScoreA: match.gameResults?.at(-1)?.scoreA ?? 0,
      gameScoreB: match.gameResults?.at(-1)?.scoreB ?? 0,
      gameResultIndex: match.gameResults?.length ? match.gameResults.length - 1 : null,
      penaltyScoreA: match.gameResults?.at(-1)?.penaltyScoreA ?? match.penaltyScoreA ?? null,
      penaltyScoreB: match.gameResults?.at(-1)?.penaltyScoreB ?? match.penaltyScoreB ?? null,
    };
  }

  startMatch(stage: Stage, roundNumber: number, match: Match): void {
    if (this.store.startMatch(stage.id, roundNumber, match.id)) delete this.drafts[match.id];
  }

  scoreLabel(stage: Stage): string {
    return (stage.scoreMode ?? 'series-wins') === 'goals' ? 'Gols' : 'Vitórias na série';
  }

  targetWins(bestOf: BestOf): number {
    return getTargetWins(bestOf);
  }

  nextGoalGame(match: Match): number {
    return (match.gameResults?.length ?? 0) + 1;
  }

  goalGameBeingEdited(match: Match): number {
    const index = this.draft(match).gameResultIndex;
    return index === null ? this.nextGoalGame(match) : index + 1;
  }

  seriesScore(match: Match): string {
    return `${match.scoreA}–${match.scoreB}`;
  }

  goalGameSummary(match: Match): string {
    return (match.gameResults ?? []).map((game) =>
      `${game.scoreA}–${game.scoreB}${game.penaltyScoreA !== undefined && game.penaltyScoreB !== undefined ? ` (Pênaltis ${game.penaltyScoreA}–${game.penaltyScoreB})` : ''}`,
    ).join(' · ');
  }

  completedScoreSummary(stage: Stage, match: Match): string {
    return stage.scoreMode === 'goals'
      ? `${this.seriesScore(match)} vitórias · ${this.goalGameSummary(match)}`
      : this.seriesScore(match);
  }

  saveProgress(stage: Stage, roundNumber: number, match: Match): void {
    const result = this.draft(match);
    if (this.store.updateMatchProgress(stage.id, roundNumber, match.id, Number(result.scoreA), Number(result.scoreB))) {
      delete this.drafts[match.id];
    }
  }

  rounds(stage: Stage) {
    return stage.rounds;
  }

  actionableMatches(round: { matches: Match[] }): Match[] {
    return round.matches.filter((match) => match.status === 'pending' || match.status === 'in-progress' || this.editingMatches.has(match.id));
  }

  completedMatches(round: { matches: Match[] }): Match[] {
    return round.matches.filter((match) => (match.status === 'completed' || match.status === 'bye') && !this.editingMatches.has(match.id));
  }

  isCorrection(match: Match): boolean {
    return this.editingMatches.has(match.id);
  }
}
