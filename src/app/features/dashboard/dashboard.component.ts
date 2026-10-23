import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { calculateStandings, calculateTournamentRecords } from '../../domain/tournament-engine';
import { Match, Round, Stage } from '../../domain/tournament.model';
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
  readonly isDisplayMode = inject(ActivatedRoute).snapshot.data['displayMode'] === true;
  readonly records = computed(() => calculateTournamentRecords(this.tournament()));
  readonly matchFeed = computed(() => this.tournament().stages.flatMap((stage) => stage.rounds.flatMap((round) =>
    round.matches.map((match) => ({ stage, round, match })),
  )));
  readonly liveMatches = computed(() => this.matchFeed().filter(({ match }) => match.status === 'in-progress'));
  readonly nextMatches = computed(() => this.matchFeed().filter(({ match }) => match.status === 'pending' && match.playerAId && match.playerBId).slice(0, 4));
  readonly completedSeries = computed(() => this.tournament().stages.reduce(
    (count, stage) => count + stage.rounds.reduce((roundCount, round) => roundCount + round.matches.filter((match) => match.status === 'completed').length, 0), 0,
  ));
  readonly completedMatches = computed(() => this.tournament().stages.reduce(
    (total, stage) => total + stage.rounds.reduce((count, round) => count + round.matches.filter((match) => match.status !== 'pending').length, 0), 0,
  ));

  standings(stage: Stage) {
    const players = this.tournament().players;
    return calculateStandings(stage, stage.participantIds ? players.filter((player) => stage.participantIds!.includes(player.id)) : players);
  }

  playerName(playerId: string | null): string {
    return this.tournament().players.find((player) => player.id === playerId)?.displayName ?? 'A definir';
  }

  matchLabel(match: Match): string {
    if (match.status === 'bye') return 'Classificado por bye';
    if (match.status === 'completed') return `${match.scoreA} – ${match.scoreB}`;
    return 'Aguardando resultado';
  }

  record(playerId: string | null) {
    return this.records().find((item) => item.player.id === playerId);
  }

  roundLabel(round: Round): string {
    return `Rodada ${round.number}`;
  }

  requestFullscreen(): void {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }
}
