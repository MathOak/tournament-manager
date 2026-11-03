import { TestBed } from '@angular/core/testing';
import { Match } from '../../../../domain/tournament.model';
import { BracketMatchCardComponent } from './bracket-match-card.component';

describe('BracketMatchCardComponent', () => {
  it('renders score, labels and winner state accessibly', async () => {
    await TestBed.configureTestingModule({ imports: [BracketMatchCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BracketMatchCardComponent);
    const match: Match = { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 2, scoreB: 1, winnerId: 'p1', status: 'completed' };
    fixture.componentRef.setInput('match', match);
    fixture.componentRef.setInput('matchIndex', 0);
    fixture.componentRef.setInput('playerALabel', 'Ana');
    fixture.componentRef.setInput('playerBLabel', 'Bia');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('article')?.getAttribute('aria-label')).toContain('Ana contra Bia');
    expect(element.querySelector('.player-winner')?.textContent).toContain('Ana');
    expect(element.textContent).toContain('2');
    expect(element.textContent).toContain('FINAL');
  });

  it('shows the bye badge centered over the score rows', async () => {
    await TestBed.configureTestingModule({ imports: [BracketMatchCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BracketMatchCardComponent);
    fixture.componentRef.setInput('match', { id: 'bye', playerAId: 'p1', playerBId: null, scoreA: 0, scoreB: 0, winnerId: 'p1', status: 'bye' });
    fixture.componentRef.setInput('matchIndex', 0);
    fixture.componentRef.setInput('playerALabel', 'Ana');
    fixture.componentRef.setInput('playerBLabel', 'BYE');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Avança por bye');
  });
});
