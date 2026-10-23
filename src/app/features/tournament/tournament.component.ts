import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateStandings, calculateTournamentRecords } from '../../domain/tournament-engine';
import { BestOf, SeedMode, Stage, StageFormat } from '../../domain/tournament.model';
import { TournamentStore } from '../../core/tournament-store.service';

@Component({
  selector: 'app-tournament-setup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tournament.component.html',
})
export class TournamentComponent {
  readonly store = inject(TournamentStore);
  tournamentName = this.store.tournament().name;
  game = this.store.tournament().game;
  format: StageFormat = 'swiss';
  bestOf: BestOf = 3;
  rounds = 3;
  sourceStageId = '';
  topCount = 4;
  qualifiedIds: string[] = [];
  seedMode: SeedMode = 'standings';
  manualSeedIds: string[] = [];
  qualificationBestOf: BestOf = 3;
  tieDecisionConfirmed = false;
  previewOpen = false;
  previewSeedIds: string[] = [];

  constructor() {
    effect(() => {
      const stages = this.completedSwissStages;
      if (stages.length && !this.sourceStageId) {
        this.sourceStageId = stages[0].id;
        this.selectTopClassified();
      }
    });
  }

  get completedSwissStages(): Stage[] {
    return this.store.tournament().stages.filter((stage) => stage.format === 'swiss' &&
      stage.rounds.length >= stage.totalRounds && !stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending' || match.status === 'in-progress')));
  }

  get sourceSwiss(): Stage | undefined {
    return this.completedSwissStages.find((stage) => stage.id === this.sourceStageId) ?? this.completedSwissStages[0];
  }

  get swissStandings() {
    if (!this.sourceSwiss) return [];
    const players = this.store.tournament().players;
    const eligible = this.sourceSwiss.participantIds
      ? players.filter((player) => this.sourceSwiss!.participantIds!.includes(player.id))
      : players;
    return calculateStandings(this.sourceSwiss, eligible);
  }

  get selectedBoundaryTie(): boolean {
    if (this.qualifiedIds.length < 1 || this.qualifiedIds.length >= this.swissStandings.length) return false;
    const sorted = this.swissStandings;
    const selectedPoints = sorted.filter((entry) => this.qualifiedIds.includes(entry.player.id)).map((entry) => entry.points);
    const unselectedPoints = sorted.filter((entry) => !this.qualifiedIds.includes(entry.player.id)).map((entry) => entry.points);
    return Math.min(...selectedPoints) === Math.max(...unselectedPoints);
  }

  saveDetails(): void {
    this.store.updateTournamentDetails(this.tournamentName, this.game);
  }

  createStage(): void {
    this.store.addStage(this.format, this.bestOf, this.rounds);
  }

  nextRound(stageId: string): void {
    this.store.startNextSwissRound(stageId);
  }

  removeStage(stageId: string): void {
    if (!confirm('Excluir esta etapa e todas as partidas?')) return;
    this.store.removeStage(stageId);
  }

  hasPendingMatches(stage: Stage): boolean {
    return stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending' || match.status === 'in-progress'));
  }

  onSourceStageChange(stageId: string): void {
    this.sourceStageId = stageId;
    this.selectTopClassified();
  }

  selectTopClassified(): void {
    this.qualifiedIds = this.swissStandings.slice(0, Math.max(2, this.topCount)).map((entry) => entry.player.id);
    this.manualSeedIds = this.swissStandings.map((entry) => entry.player.id).filter((id) => this.qualifiedIds.includes(id));
    this.tieDecisionConfirmed = false;
  }

  toggleQualified(playerId: string, selected: boolean): void {
    this.qualifiedIds = selected ? [...this.qualifiedIds, playerId] : this.qualifiedIds.filter((id) => id !== playerId);
    this.manualSeedIds = this.swissStandings.map((entry) => entry.player.id).filter((id) => this.qualifiedIds.includes(id));
    this.tieDecisionConfirmed = false;
    this.previewOpen = false;
  }

  moveSeed(playerId: string, direction: -1 | 1): void {
    const index = this.manualSeedIds.indexOf(playerId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= this.manualSeedIds.length) return;
    const updated = this.manualSeedIds.slice();
    [updated[index], updated[target]] = [updated[target], updated[index]];
    this.manualSeedIds = updated;
    this.previewOpen = false;
  }

  createElimination(): void {
    const source = this.sourceSwiss;
    if (!source) return;
    if (this.selectedBoundaryTie && !this.tieDecisionConfirmed) return;
    if (!this.previewOpen) {
      const rankedIds = this.swissStandings.map((entry) => entry.player.id).filter((id) => this.qualifiedIds.includes(id));
      this.previewSeedIds = this.seedMode === 'manual' ? this.manualSeedIds.slice()
        : this.seedMode === 'random' ? rankedIds.slice().sort(() => Math.random() - 0.5) : rankedIds;
      this.previewOpen = true;
      return;
    }
    if (this.store.createEliminationFromSwiss(source.id, this.qualifiedIds, this.seedMode, this.previewSeedIds, this.qualificationBestOf)) {
      this.previewOpen = false;
    }
  }

  cancelPreview(): void {
    this.previewOpen = false;
  }

  get previewMatchups(): Array<{ seedA: number; playerA: string; seedB: number; playerB: string }> {
    const size = 2 ** Math.ceil(Math.log2(Math.max(2, this.previewSeedIds.length)));
    let positions = [1, 2];
    while (positions.length < size) {
      const nextSize = positions.length * 2;
      positions = positions.flatMap((seed) => [seed, nextSize + 1 - seed]);
    }
    const bySeed = new Map(this.previewSeedIds.map((id, index) => [index + 1, id]));
    const rows: Array<{ seedA: number; playerA: string; seedB: number; playerB: string }> = [];
    for (let index = 0; index < positions.length; index += 2) {
      const seedA = positions[index];
      const seedB = positions[index + 1];
      const idA = bySeed.get(seedA);
      const idB = bySeed.get(seedB);
      if (idA || idB) rows.push({ seedA, playerA: idA ? this.playerName(idA) : 'Bye', seedB, playerB: idB ? this.playerName(idB) : 'Bye' });
    }
    return rows;
  }

  playerName(playerId: string): string {
    return this.store.tournament().players.find((player) => player.id === playerId)?.displayName ?? 'Jogador';
  }

  record(playerId: string) {
    return calculateTournamentRecords(this.store.tournament()).find((entry) => entry.player.id === playerId);
  }
}
