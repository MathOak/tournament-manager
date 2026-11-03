import { TestBed } from '@angular/core/testing';
import { Stage } from '../../../../domain/tournament.model';
import { BracketConnectorsComponent } from './bracket-connectors.component';

describe('BracketConnectorsComponent', () => {
  it('draws one SVG connector path for each next-round match', async () => {
    await TestBed.configureTestingModule({ imports: [BracketConnectorsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BracketConnectorsComponent);
    const stage: Stage = {
      id: 's', name: 'Playoffs', format: 'single-elimination', bestOf: 3, status: 'in-progress', totalRounds: 2,
      rounds: [
        { id: 'r1', number: 1, matches: [
          { id: 'm1', playerAId: 'a', playerBId: 'b', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
          { id: 'm2', playerAId: 'c', playerBId: 'd', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
        ] },
        { id: 'r2', number: 2, matches: [{ id: 'm3', playerAId: null, playerBId: null, scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' }] },
      ],
    };
    fixture.componentRef.setInput('stage', stage);
    fixture.componentRef.setInput('roundIndex', 0);
    fixture.componentRef.setInput('boardHeight', 300);
    fixture.componentRef.setInput('matchHeight', 60);
    fixture.componentRef.setInput('baseGap', 18);
    fixture.componentRef.setInput('connectorWidth', 42);
    fixture.detectChanges();
    const paths = (fixture.nativeElement as HTMLElement).querySelectorAll('path');
    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute('d')).toContain('H 42');
  });
});
