import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tournament-stats',
  standalone: true,
  templateUrl: './tournament-stats.component.html',
  styleUrl: './tournament-stats.component.css',
})
export class TournamentStatsComponent {
  @Input() players = 0;
  @Input() liveMatches = 0;
  @Input() completedSeries = 0;
}
