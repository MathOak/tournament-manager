import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Match, Stage } from '../../domain/tournament.model';
import { TournamentStore } from '../../core/tournament-store.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly store = inject(TournamentStore);
  readonly drafts: Record<string, { scoreA: number; scoreB: number }> = {};
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

  draft(match: Match): { scoreA: number; scoreB: number } {
    return this.drafts[match.id] ??= { scoreA: match.scoreA, scoreB: match.scoreB };
  }

  saveResult(stage: Stage, roundNumber: number, match: Match): void {
    const result = this.draft(match);
    if (this.store.updateMatch(stage.id, roundNumber, match.id, Number(result.scoreA), Number(result.scoreB))) {
      delete this.drafts[match.id];
      this.editingMatches.delete(match.id);
    }
  }

  beginCorrection(match: Match): void {
    if (!confirm('Corrigir este resultado pode alterar os jogadores que avançaram na chave. Continuar?')) return;
    this.editingMatches.add(match.id);
    this.drafts[match.id] = { scoreA: match.scoreA, scoreB: match.scoreB };
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
