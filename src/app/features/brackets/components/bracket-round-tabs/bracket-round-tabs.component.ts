import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Stage } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-bracket-round-tabs',
  standalone: true,
  templateUrl: './bracket-round-tabs.component.html',
  styleUrl: './bracket-round-tabs.component.css',
})
export class BracketRoundTabsComponent {
  @Input({ required: true }) stage!: Stage;
  @Input() selectedIndex = 0;
  @Output() readonly roundSelected = new EventEmitter<number>();

  roundLabel(roundIndex: number): string {
    const participants = (this.stage.rounds[roundIndex]?.matches.length ?? 0) * 2;
    if (participants === 2) return 'Final';
    if (participants === 4) return 'Semifinal';
    if (participants === 8) return 'Quartas de final';
    if (participants === 16) return 'Oitavas de final';
    return `Rodada de ${participants}`;
  }
}
