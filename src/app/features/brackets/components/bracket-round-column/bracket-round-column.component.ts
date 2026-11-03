import { Component, Input } from '@angular/core';
import { Player, Round, Stage } from '../../../../domain/tournament.model';
import { BracketMatchCardComponent } from '../bracket-match-card/bracket-match-card.component';

@Component({
  selector: 'app-bracket-round-column',
  standalone: true,
  imports: [BracketMatchCardComponent],
  templateUrl: './bracket-round-column.component.html',
  styleUrl: './bracket-round-column.component.css',
})
export class BracketRoundColumnComponent {
  @Input({ required: true }) stage!: Stage;
  @Input({ required: true }) round!: Round;
  @Input({ required: true }) roundIndex!: number;
  @Input({ required: true }) players: Player[] = [];
  @Input({ required: true }) topMargin = 0;
  @Input({ required: true }) matchGap = 0;

  roundLabel(roundIndex: number): string {
    const matchCount = this.stage.rounds[roundIndex]?.matches.length ?? 0;
    const participantCount = matchCount * 2;
    if (participantCount === 2) return 'Final';
    if (participantCount === 4) return 'Semifinal';
    if (participantCount === 8) return 'Quartas de final';
    if (participantCount === 16) return 'Oitavas de final';
    return `Rodada de ${participantCount}`;
  }

  participantLabel(matchIndex: number, side: 'a' | 'b'): string {
    const match = this.round.matches[matchIndex];
    const playerId = side === 'a' ? match.playerAId : match.playerBId;
    if (playerId) return this.players.find((player) => player.id === playerId)?.displayName ?? 'A definir';
    if (match.status === 'bye' && (match.playerAId || match.playerBId)) return 'BYE';
    if (this.roundIndex === 0) return 'A definir';
    const sourceMatchIndex = matchIndex * 2 + (side === 'a' ? 0 : 1);
    const sourceMatch = this.stage.rounds[this.roundIndex - 1]?.matches[sourceMatchIndex];
    if (!sourceMatch) return 'A definir';
    return `Vencedor de ${this.roundLabel(this.roundIndex - 1)} · Jogo ${sourceMatchIndex + 1}`;
  }
}
