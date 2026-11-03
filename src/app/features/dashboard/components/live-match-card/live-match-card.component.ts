import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-live-match-card',
  standalone: true,
  templateUrl: './live-match-card.component.html',
  styleUrl: './live-match-card.component.css',
})
export class LiveMatchCardComponent {
  @Input() stageName = '';
  @Input() roundName = '';
  @Input() bestOf: 3 | 5 = 3;
  @Input() playerA = '';
  @Input() playerB = '';
  @Input() recordA = '0V – 0D';
  @Input() recordB = '0V – 0D';
  @Input() scoreA = 0;
  @Input() scoreB = 0;
}
