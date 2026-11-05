import { Component, Input } from '@angular/core';
import { ScoreMode } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-upcoming-match-card',
  standalone: true,
  templateUrl: './upcoming-match-card.component.html',
  styleUrl: './upcoming-match-card.component.css',
})
export class UpcomingMatchCardComponent {
  @Input() stageName = '';
  @Input() roundName = '';
  @Input() bestOf = 2;
  @Input() scoreMode: ScoreMode = 'series-wins';
  @Input() playerA = '';
  @Input() playerB = '';
  @Input() recordA = '0V–0D';
  @Input() recordB = '0V–0D';
}
