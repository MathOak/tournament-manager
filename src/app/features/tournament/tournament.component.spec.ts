import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TournamentStore } from '../../core/tournament-store.service';
import { Tournament, createEmptyTournament } from '../../domain/tournament.model';
import { TournamentComponent } from './tournament.component';

function setupTournament(): Tournament {
  const tournament = createEmptyTournament();
  tournament.players = [
    { id: 'p1', displayName: 'Ana' },
    { id: 'p2', displayName: 'Bia' },
    { id: 'p3', displayName: 'Caio' },
    { id: 'p4', displayName: 'Duda' },
  ];
  tournament.stages = [{
    id: 'swiss-1', name: 'Fase Suíça', format: 'swiss', bestOf: 3, status: 'completed', totalRounds: 1,
    participantIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [{ id: 'round-1', number: 1, matches: [
      { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 0, scoreB: 0, winnerId: null, status: 'completed' },
      { id: 'm2', playerAId: 'p3', playerBId: 'p4', scoreA: 0, scoreB: 0, winnerId: null, status: 'completed' },
    ] }],
  }];
  return tournament;
}

describe('TournamentComponent', () => {
  let tournament: ReturnType<typeof signal<Tournament>>;
  let storeMock: TournamentStore;

  beforeEach(async () => {
    tournament = signal(setupTournament());
    storeMock = {
      tournament: tournament.asReadonly(),
      playerCount: signal(4),
      updateTournamentDetails: vi.fn(),
      addStage: vi.fn(() => true),
      startNextSwissRound: vi.fn(() => true),
      removeStage: vi.fn(),
      createEliminationFromSwiss: vi.fn(() => true),
      notice: signal(''),
    } as unknown as TournamentStore;
    await TestBed.configureTestingModule({
      imports: [TournamentComponent],
      providers: [{ provide: TournamentStore, useValue: storeMock }],
    }).compileComponents();
  });

  it('renders tournament settings and persists the name and game through the store', () => {
    const fixture = TestBed.createComponent(TournamentComponent);
    const component = fixture.componentInstance;
    component.tournamentName = ' Copa '; component.game = ' X '; component.saveDetails();
    fixture.detectChanges();
    expect(storeMock.updateTournamentDetails).toHaveBeenCalledWith(' Copa ', ' X ');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Seu torneio, suas regras');
  });

  it('creates configured stages and delegates Swiss round generation', () => {
    const fixture = TestBed.createComponent(TournamentComponent);
    const component = fixture.componentInstance;
    component.format = 'single-elimination';
    component.bestOf = 5;
    component.createStage();
    expect(storeMock.addStage).toHaveBeenCalledWith('single-elimination', 5, 3);
    component.nextRound('swiss-1');
    expect(storeMock.startNextSwissRound).toHaveBeenCalledWith('swiss-1');
  });

  it('detects a tie at the qualification boundary and blocks preview until explicitly confirmed', () => {
    const fixture = TestBed.createComponent(TournamentComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.topCount = 2;
    component.selectTopClassified();
    expect(component.selectedBoundaryTie).toBe(true);
    component.createElimination();
    expect(component.previewOpen).toBe(false);
    component.tieDecisionConfirmed = true;
    component.createElimination();
    expect(component.previewOpen).toBe(true);
    expect(component.previewMatchups).toHaveLength(1);
    component.createElimination();
    expect(storeMock.createEliminationFromSwiss).toHaveBeenCalledWith(
      'swiss-1', component.qualifiedIds, 'standings', component.previewSeedIds, 3,
    );
    expect(component.previewOpen).toBe(false);
  });

  it('reorders manual seeds within bounds and cancels a preview when selection changes', () => {
    const fixture = TestBed.createComponent(TournamentComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.qualifiedIds = ['p1', 'p2'];
    component.manualSeedIds = ['p1', 'p2'];
    component.seedMode = 'manual';
    component.previewOpen = true;
    component.moveSeed('p2', -1);
    expect(component.manualSeedIds).toEqual(['p2', 'p1']);
    expect(component.previewOpen).toBe(false);
    component.toggleQualified('p3', true);
    expect(component.qualifiedIds).toContain('p3');
    expect(component.tieDecisionConfirmed).toBe(false);
  });

  it('requires confirmation before deleting a stage', () => {
    const fixture = TestBed.createComponent(TournamentComponent);
    const component = fixture.componentInstance;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeStage('swiss-1');
    expect(storeMock.removeStage).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    component.removeStage('swiss-1');
    expect(storeMock.removeStage).toHaveBeenCalledWith('swiss-1');
    confirmSpy.mockRestore();
  });
});
