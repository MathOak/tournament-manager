import { TestBed } from '@angular/core/testing';
import { Player, Round, Stage } from '../../../../domain/tournament.model';
import { BracketRoundColumnComponent } from './bracket-round-column.component';

describe('BracketRoundColumnComponent', () => {
  it('labels rounds and future slots from their feeder matches', async () => {
    await TestBed.configureTestingModule({ imports: [BracketRoundColumnComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BracketRoundColumnComponent);
    const players: Player[] = [{ id: 'p1', displayName: 'Ana' }, { id: 'p2', displayName: 'Bia' }];
    const stage: Stage = {
      id: 's', name: 'Playoffs', format: 'single-elimination', bestOf: 3, status: 'in-progress', totalRounds: 2,
      rounds: [
        { id: 'r1', number: 1, matches: [
          { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
          { id: 'm2', playerAId: 'p2', playerBId: 'p1', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
        ] },
        { id: 'r2', number: 2, matches: [{ id: 'm2', playerAId: null, playerBId: null, scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' }] },
      ],
    };
    const round: Round = stage.rounds[1];
    fixture.componentRef.setInput('stage', stage);
    fixture.componentRef.setInput('round', round);
    fixture.componentRef.setInput('roundIndex', 1);
    fixture.componentRef.setInput('players', players);
    fixture.componentRef.setInput('topMargin', 20);
    fixture.componentRef.setInput('matchGap', 40);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.roundLabel(0)).toBe('Semifinal');
    expect(element.textContent).toContain('Final');
    expect(element.textContent).toContain('Vencedor de Semifinal · Jogo 1');
  });
});
