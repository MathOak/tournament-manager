import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-dashboard-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-hero.component.html',
  styleUrl: './dashboard-hero.component.css',
})
export class DashboardHeroComponent {
  @Input({ required: true }) tournament!: Tournament;
  @Input() completedSeries = 0;
  @Input() displayMode = false;
  @Output() readonly fullscreenRequested = new EventEmitter<void>();
}
