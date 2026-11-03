import { Component, Input } from '@angular/core';
import { Stage } from '../../../../domain/tournament.model';

@Component({
  selector: 'app-bracket-connectors',
  standalone: true,
  templateUrl: './bracket-connectors.component.html',
  styleUrl: './bracket-connectors.component.css',
})
export class BracketConnectorsComponent {
  @Input({ required: true }) stage!: Stage;
  @Input({ required: true }) roundIndex!: number;
  @Input({ required: true }) boardHeight = 0;
  @Input({ required: true }) matchHeight = 0;
  @Input({ required: true }) baseGap = 0;
  @Input({ required: true }) connectorWidth = 0;

  paths(): string[] {
    const nextRound = this.stage.rounds[this.roundIndex + 1];
    if (!nextRound) return [];
    return nextRound.matches.map((_, targetIndex) => {
      const firstSource = targetIndex * 2;
      const yA = this.matchCenter(this.roundIndex, firstSource);
      const yB = this.matchCenter(this.roundIndex, firstSource + 1);
      const yTarget = this.matchCenter(this.roundIndex + 1, targetIndex);
      const junction = Math.round(this.connectorWidth * 0.4);
      return `M 0 ${yA} H ${junction} V ${yTarget} H ${this.connectorWidth} M 0 ${yB} H ${junction} V ${yTarget}`;
    });
  }

  private roundTopMargin(roundIndex: number): number {
    return ((2 ** roundIndex) - 1) * (this.matchHeight + this.baseGap) / 2;
  }

  private roundGap(roundIndex: number): number {
    return (2 ** roundIndex) * (this.matchHeight + this.baseGap) - this.matchHeight;
  }

  private matchCenter(roundIndex: number, matchIndex: number): number {
    return this.roundTopMargin(roundIndex) + this.matchHeight / 2 + matchIndex * (this.roundGap(roundIndex) + this.matchHeight);
  }
}
