import { Component, Input } from '@angular/core';
import { MatchGameResult, ScoreMode } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-live-match-card',
  standalone: true,
  templateUrl: './live-match-card.component.html',
  styleUrl: './live-match-card.component.css',
})
export class LiveMatchCardComponent {
  @Input() stageName = '';
  @Input() roundName = '';
  @Input() bestOf = 2;
  @Input() scoreMode: ScoreMode = 'series-wins';
  @Input() playerA = '';
  @Input() playerB = '';
  @Input() recordA = '0V – 0D';
  @Input() recordB = '0V – 0D';
  @Input() scoreA = 0;
  @Input() scoreB = 0;
  @Input() penaltyScoreA: number | null = null;
  @Input() penaltyScoreB: number | null = null;
  @Input() gameResults: MatchGameResult[] = [];

  gameResultsSummary(): string {
    return this.gameResults.map((game) =>
      `${game.scoreA}–${game.scoreB}${game.penaltyScoreA !== undefined && game.penaltyScoreB !== undefined ? ` (Pênaltis ${game.penaltyScoreA}–${game.penaltyScoreB})` : ''}`,
    ).join(' · ');
  }
}
