import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TournamentStore } from '../../core/tournament-store.service';
import { Tournament, createEmptyTournament } from '../../domain/tournament.model';
import { DashboardComponent } from './dashboard.component';

function dashboardTournament(withStage: boolean): Tournament {
  const tournament = createEmptyTournament();
  tournament.name = 'Dashboard Cup';
  tournament.players = [{ id: 'p1', displayName: 'Ana' }, { id: 'p2', displayName: 'Bia' }];
  if (withStage) {
    tournament.stages = [{
      id: 'stage-1', name: 'Playoffs', format: 'single-elimination', bestOf: 3, status: 'in-progress', totalRounds: 1,
      participantIds: ['p1', 'p2'],
      rounds: [{ id: 'round-1', number: 1, matches: [
        { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 1, scoreB: 0, winnerId: null, status: 'in-progress' },
      ] }],
    }];
  }
  return tournament;
}

describe('DashboardComponent', () => {
  let tournament: ReturnType<typeof signal<Tournament>>;
  let storeMock: TournamentStore;

  beforeEach(async () => {
    tournament = signal(dashboardTournament(false));
    storeMock = {
      tournament: tournament.asReadonly(),
      tournaments: computed(() => [tournament()]),
      selectedTournamentId: computed(() => tournament().id),
      ready: signal(true),
      playerCount: computed(() => tournament().players.length),
      notice: signal(''),
      dismissNotice: vi.fn(),
      selectTournament: vi.fn(() => true),
      createTournament: vi.fn(),
    } as unknown as TournamentStore;
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), { provide: TournamentStore, useValue: storeMock }],
    }).compileComponents();
  });

  it('shows the empty tournament prompt when there are no stages', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('O torneio ainda não começou');
    expect(element.querySelector('.live-section')).toBeNull();
  });

  it('prioritizes live matches and embeds the elimination bracket when available', () => {
    tournament.set(dashboardTournament(true));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Partidas ao vivo');
    expect(element.textContent).toContain('Ana');
    expect(element.querySelector('.bracket-display-page.bracket-embedded')).toBeTruthy();
    expect(element.textContent).toContain('1');
  });
});
