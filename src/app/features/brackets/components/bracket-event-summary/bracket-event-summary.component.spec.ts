import { TestBed } from '@angular/core/testing';
import { createEmptyTournament } from '../../../../domain/tournament.model';
import { BracketEventSummaryComponent } from './bracket-event-summary.component';

describe('BracketEventSummaryComponent', () => {
  it('shows tournament, stage, best-of and participant count', async () => {
    await TestBed.configureTestingModule({ imports: [BracketEventSummaryComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BracketEventSummaryComponent);
    const tournament = createEmptyTournament();
    tournament.name = 'Final Cup';
    tournament.game = 'Arena';
    tournament.players = [{ id: 'p1', displayName: 'Ana' }];
    fixture.componentRef.setInput('tournament', tournament);
    fixture.componentRef.setInput('stage', { id: 's', name: 'Finals', format: 'single-elimination', bestOf: 5, status: 'in-progress', totalRounds: 1, participantIds: ['p1', 'p2'] });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Final Cup');
    expect(text).toContain('Arena');
    expect(text).toContain('Finals');
    expect(text).toContain('MD5');
    expect(text).toContain('2 participantes');
  });
});
