import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TournamentStore } from '../../core/tournament-store.service';
import { Tournament, createEmptyTournament } from '../../domain/tournament.model';
import { AdminComponent } from './admin.component';

function adminTournament(): Tournament {
  const tournament = createEmptyTournament();
  tournament.players = [{ id: 'p1', displayName: 'Ana' }, { id: 'p2', displayName: 'Bia' }];
  tournament.stages = [{
    id: 'stage-1', name: 'Playoffs', format: 'single-elimination', bestOf: 3, status: 'in-progress', totalRounds: 1,
    participantIds: ['p1', 'p2'],
    rounds: [{ id: 'round-1', number: 1, matches: [
      { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
    ] }],
  }];
  return tournament;
}

describe('AdminComponent', () => {
  let tournament: ReturnType<typeof signal<Tournament>>;
  let storeMock: TournamentStore;

  beforeEach(async () => {
    tournament = signal(adminTournament());
    storeMock = {
      tournament: tournament.asReadonly(),
      notice: signal(''),
      updateMatch: vi.fn(() => true),
      updateMatchProgress: vi.fn(() => true),
    } as unknown as TournamentStore;
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [provideRouter([]), { provide: TournamentStore, useValue: storeMock }],
    }).compileComponents();
  });

  it('shows counters and actionable match editors for the selected stage', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('1 abertas');
    expect(element.textContent).toContain('0 ao vivo');
    expect(element.querySelectorAll('.admin-match')).toHaveLength(1);
    expect(element.querySelector('[aria-label="Vitórias na série de Ana"]')).toBeTruthy();
    expect(element.querySelector('[aria-label="Vitórias na série de Bia"]')).toBeTruthy();
  });

  it('submits completed and partial scores through the store', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    const stage = tournament().stages[0];
    const match = stage.rounds[0].matches[0];
    component.draft(match).scoreA = 2;
    component.draft(match).scoreB = 1;
    component.saveResult(stage, 1, match);
    expect(storeMock.updateMatch).toHaveBeenCalledWith(stage.id, 1, match.id, 2, 1);
    expect(component.drafts[match.id]).toBeUndefined();

    component.draft(match).scoreA = 1;
    component.draft(match).scoreB = 0;
    component.saveProgress(stage, 1, match);
    expect(storeMock.updateMatchProgress).toHaveBeenCalledWith(stage.id, 1, match.id, 1, 0);
  });

  it('requires confirmation before editing a completed result', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    const match = tournament().stages[0].rounds[0].matches[0];
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.beginCorrection(match);
    expect(component.isCorrection(match)).toBe(false);
    confirmSpy.mockReturnValue(true);
    component.beginCorrection({ ...match, scoreA: 2, scoreB: 1, winnerId: 'p1', status: 'completed' });
    expect(component.isCorrection(match)).toBe(true);
    expect(component.draft(match)).toEqual({ scoreA: 2, scoreB: 1 });
    confirmSpy.mockRestore();
  });

  it('uses the empty state when no stage exists', () => {
    tournament.set(createEmptyTournament());
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nenhuma etapa pronta');
    expect((fixture.nativeElement as HTMLElement).querySelector('.admin-toolbar')).toBeNull();
  });
});
