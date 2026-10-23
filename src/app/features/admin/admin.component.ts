import { Component, inject } from '@angular/core';
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
    }
  }
}
