import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
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
  @Input() displayLink = '/display/dashboard';
  @Input() exitLink = '/';
  @Output() readonly fullscreenRequested = new EventEmitter<void>();
  readonly fullscreen = signal(typeof document !== 'undefined' && !!document.fullscreenElement);

  @HostListener('document:fullscreenchange')
  syncFullscreen(): void {
    this.fullscreen.set(!!document.fullscreenElement);
  }
}
