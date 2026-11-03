import { Component, Input } from '@angular/core';
import { calculateStandings, PlayerTournamentRecord } from '../../../../domain/tournament-engine';
import { Player, Round, Stage } from '../../../../domain/tournament.model';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-stage-overview',
  standalone: true,
  imports: [StatusBadgeComponent],
  templateUrl: './stage-overview.component.html',
  styleUrl: './stage-overview.component.css',
})
export class StageOverviewComponent {
  @Input({ required: true }) stage!: Stage;
  @Input() players: Player[] = [];
  @Input() records: PlayerTournamentRecord[] = [];

  standings() {
    const eligible = this.stage.participantIds ? this.players.filter((player) => this.stage.participantIds!.includes(player.id)) : this.players;
    return calculateStandings(this.stage, eligible);
  }

  playerName(playerId: string | null): string {
    return this.players.find((player) => player.id === playerId)?.displayName ?? 'A definir';
  }

  record(playerId: string | null): PlayerTournamentRecord | undefined {
    return this.records.find((entry) => entry.player.id === playerId);
  }

  roundLabel(round: Round): string {
    return `Rodada ${round.number}`;
  }
}
