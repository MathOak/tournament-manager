import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BestOf, Stage, StageFormat } from '../../domain/tournament.model';
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
    return stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending'));
  }
}
