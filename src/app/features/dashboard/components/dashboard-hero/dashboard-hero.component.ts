import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Tournament } from '../../../../domain/tournament.model';
import { DashboardActionsComponent } from '../../../../shared/ui/dashboard-actions/dashboard-actions.component';

@Component({
  selector: 'app-dashboard-hero',
  standalone: true,
  imports: [DashboardActionsComponent],
  templateUrl: './dashboard-hero.component.html',
  styleUrl: './dashboard-hero.component.css',
})
export class DashboardHeroComponent {
  @Input({ required: true }) tournament!: Tournament;
  @Input() completedSeries = 0;
  @Input() displayMode = false;
  @Output() readonly fullscreenRequested = new EventEmitter<void>();
}
