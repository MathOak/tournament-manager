import { TestBed } from '@angular/core/testing';
import { Stage } from '../../../../domain/tournament.model';
import { BracketRoundTabsComponent } from './bracket-round-tabs.component';

describe('BracketRoundTabsComponent', () => {
  it('renders labeled rounds and emits the chosen round index', async () => {
    await TestBed.configureTestingModule({ imports: [BracketRoundTabsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BracketRoundTabsComponent);
    const stage: Stage = {
      id: 's', name: 'Playoffs', format: 'single-elimination', bestOf: 3, status: 'in-progress', totalRounds: 2,
      rounds: [
        { id: 'r1', number: 1, matches: [{ id: 'm1', playerAId: 'a', playerBId: 'b', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' }, { id: 'm2', playerAId: 'c', playerBId: 'd', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' }] },
        { id: 'r2', number: 2, matches: [{ id: 'm3', playerAId: null, playerBId: null, scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' }] },
      ],
    };
    fixture.componentRef.setInput('stage', stage);
    const selected = vi.fn();
    fixture.componentInstance.roundSelected.subscribe(selected);
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons[0].textContent).toContain('Semifinal');
    expect(buttons[1].textContent).toContain('Final');
    buttons[1].click();
    expect(selected).toHaveBeenCalledWith(1);
  });
});
