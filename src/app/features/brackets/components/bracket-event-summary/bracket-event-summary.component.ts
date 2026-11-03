import { Component, Input } from '@angular/core';
import { Stage, Tournament } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-bracket-event-summary',
  standalone: true,
  templateUrl: './bracket-event-summary.component.html',
  styleUrl: './bracket-event-summary.component.css',
})
export class BracketEventSummaryComponent {
  @Input({ required: true }) tournament!: Tournament;
  @Input({ required: true }) stage!: Stage;
}
