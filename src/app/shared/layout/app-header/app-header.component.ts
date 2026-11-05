import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_CONFIG } from '../../../core/app-config';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent {
  readonly config = inject(APP_CONFIG);
  @Input({ required: true }) theme: 'dark' | 'light' = 'dark';
  @Output() readonly themeToggle = new EventEmitter<void>();
}
