import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { calculateStandings } from '../../domain/tournament-engine';
import { Match, Stage } from '../../domain/tournament.model';
import { TournamentStore } from '../../core/tournament-store.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly store = inject(TournamentStore);
  readonly tournament = this.store.tournament;
  readonly completedMatches = computed(() => this.tournament().stages.reduce(
    (total, stage) => total + stage.rounds.reduce((count, round) => count + round.matches.filter((match) => match.status !== 'pending').length, 0), 0,
  ));

  standings(stage: Stage) {
    return calculateStandings(stage, this.tournament().players);
  }

  playerName(playerId: string | null): string {
    return this.tournament().players.find((player) => player.id === playerId)?.displayName ?? 'A definir';
  }

  matchLabel(match: Match): string {
    if (match.status === 'bye') return 'Classificado por bye';
    if (match.status === 'completed') return `${match.scoreA} – ${match.scoreB}`;
    return 'Aguardando resultado';
  }
}
