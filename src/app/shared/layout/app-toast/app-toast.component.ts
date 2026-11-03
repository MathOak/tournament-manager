import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './app-toast.component.html',
  styleUrl: './app-toast.component.css',
})
export class AppToastComponent {
  @Input() message = '';
  @Output() readonly dismissed = new EventEmitter<void>();
}
