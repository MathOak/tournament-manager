import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  @Input() icon = '✦';
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() compact = false;
}
