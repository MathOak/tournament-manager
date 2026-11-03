import { TestBed } from '@angular/core/testing';
import { Tournament, createEmptyTournament } from '../../../../domain/tournament.model';
import { StageOverviewComponent } from './stage-overview.component';

describe('StageOverviewComponent', () => {
  it('renders Swiss standings and a semantic stage status', async () => {
    await TestBed.configureTestingModule({ imports: [StageOverviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StageOverviewComponent);
    const tournament: Tournament = createEmptyTournament();
    tournament.players = [{ id: 'p1', displayName: 'Ana' }, { id: 'p2', displayName: 'Bia' }];
    const stage = {
      id: 's', name: 'Fase Suíça', format: 'swiss' as const, bestOf: 3 as const, status: 'completed' as const,
      totalRounds: 1, participantIds: ['p1', 'p2'],
      rounds: [{ id: 'r', number: 1, matches: [{ id: 'm', playerAId: 'p1', playerBId: 'p2', scoreA: 2, scoreB: 0, winnerId: 'p1', status: 'completed' as const }] }],
    };
    fixture.componentRef.setInput('stage', stage);
    fixture.componentRef.setInput('players', tournament.players);
    fixture.componentRef.setInput('records', []);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Fase Suíça');
    expect(element.textContent).toContain('Concluída');
    expect(element.querySelectorAll('.table-row')).toHaveLength(3);
    expect(element.textContent).toContain('Ana');
    expect(element.textContent).toContain('2');
  });
});
