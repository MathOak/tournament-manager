import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-actions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-actions.component.html',
  styleUrl: './dashboard-actions.component.css',
})
export class DashboardActionsComponent {
  @Input() displayMode = false;
  @Input() routerLink = '/display';
  @Output() readonly fullscreenRequested = new EventEmitter<void>();
}
