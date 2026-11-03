import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() variant: 'info' | 'success' | 'warning' | 'highlight' = 'info';
}
