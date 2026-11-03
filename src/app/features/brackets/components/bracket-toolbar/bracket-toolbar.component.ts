import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Stage, Tournament } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-bracket-toolbar',
  standalone: true,
  templateUrl: './bracket-toolbar.component.html',
  styleUrl: './bracket-toolbar.component.css',
})
export class BracketToolbarComponent {
  @Input() embedded = false;
  @Input() ready = false;
  @Input() fullscreen = false;
  @Input() tournaments: Tournament[] = [];
  @Input() selectedTournamentId = '';
  @Input() stages: Stage[] = [];
  @Input() selectedStageId = '';
  @Output() readonly tournamentSelected = new EventEmitter<string>();
  @Output() readonly stageSelected = new EventEmitter<string>();
  @Output() readonly fullscreenToggled = new EventEmitter<void>();
  @Output() readonly tournamentCreated = new EventEmitter<void>();
}
