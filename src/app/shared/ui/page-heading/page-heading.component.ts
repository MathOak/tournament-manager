import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-heading',
  standalone: true,
  templateUrl: './page-heading.component.html',
  styleUrl: './page-heading.component.css',
})
export class PageHeadingComponent {
  @Input() kicker = '';
  @Input({ required: true }) title = '';
  @Input() description = '';
}
