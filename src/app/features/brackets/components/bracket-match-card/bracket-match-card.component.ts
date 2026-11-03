import { Component, Input } from '@angular/core';
import { Match } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-bracket-match-card',
  standalone: true,
  templateUrl: './bracket-match-card.component.html',
  styleUrl: './bracket-match-card.component.css',
})
export class BracketMatchCardComponent {
  @Input({ required: true }) match!: Match;
  @Input({ required: true }) matchIndex!: number;
  @Input({ required: true }) playerALabel!: string;
  @Input({ required: true }) playerBLabel!: string;
}
