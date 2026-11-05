import { Component, inject } from '@angular/core';
import { APP_CONFIG } from '../../../core/app-config';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.css',
})
export class AppFooterComponent {
  readonly config = inject(APP_CONFIG);
}
