import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Stage, Tournament } from '../../../../domain/tournament.model';
import { SelectMenuComponent, SelectMenuOption } from '../../../../shared/ui/select-menu/select-menu.component';
import { DashboardActionsComponent } from '../../../../shared/ui/dashboard-actions/dashboard-actions.component';

@Component({
  selector: 'app-bracket-toolbar',
  standalone: true,
  imports: [SelectMenuComponent, DashboardActionsComponent],
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
  @Input() displayMode = false;
  @Output() readonly tournamentSelected = new EventEmitter<string>();
  @Output() readonly stageSelected = new EventEmitter<string>();
  @Output() readonly fullscreenRequested = new EventEmitter<void>();
  @Output() readonly tournamentCreated = new EventEmitter<void>();

  get tournamentOptions(): SelectMenuOption[] {
    return this.tournaments.map((item) => ({ value: item.id, title: item.name, subtitle: item.game || undefined }));
  }

  get stageOptions(): SelectMenuOption[] {
    return this.stages.map((stage) => ({ value: stage.id, title: stage.name }));
  }
}
