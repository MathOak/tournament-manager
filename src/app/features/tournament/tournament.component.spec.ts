import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TournamentStore } from '../../core/tournament-store.service';
import { MatchPairing, Tournament, createEmptyTournament } from '../../domain/tournament.model';
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
      updateTournamentDetails: vi.fn(() => true),
      addStage: vi.fn(() => true),
      startNextSwissRound: vi.fn(() => true),
      startManualSwissRound: vi.fn(() => true),
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
    component.tournamentName = ' Copa '; component.gameId = 'ea-sports-fc'; component.saveDetails();
    fixture.detectChanges();
    expect(storeMock.updateTournamentDetails).toHaveBeenCalledWith(' Copa ', 'ea-sports-fc');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Seu torneio, suas regras');
  });

  it('offers the same configurable MD formats for every catalog game', () => {
    const component = TestBed.createComponent(TournamentComponent).componentInstance;
    expect(component.bestOfOptions.map((option) => option.value)).toEqual(['1', '2', '3', '5']);
    component.selectGame('ea-sports-fc');
    expect(component.selectedGame?.category).toBe('goals');
    expect(component.bestOfOptions.map((option) => option.value)).toEqual(['1', '2', '3', '5']);
    component.selectGame('clash-royale');
    expect(component.bestOfOptions.map((option) => option.value)).toEqual(['1', '2', '3', '5']);
  });

  it('creates configured stages and delegates Swiss round generation', () => {
    const fixture = TestBed.createComponent(TournamentComponent);
    const component = fixture.componentInstance;
    component.format = 'single-elimination';
    component.bestOf = 5;
    component.createStage();
    expect(storeMock.addStage).toHaveBeenCalledWith('single-elimination', 5, 3, 'automatic');
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
      'swiss-1', component.qualifiedIds, 'standings', component.previewSeedIds, 2, 'automatic', undefined,
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

  it('creates a manually arranged elimination stage only after explicit confirmation', () => {
    const component = TestBed.createComponent(TournamentComponent).componentInstance;
    component.format = 'single-elimination';
    component.pairingMode = 'manual';
    const players = tournament().players;
    component.manualPairings = [
      { playerAId: players[0].id, playerBId: players[2].id },
      { playerAId: players[1].id, playerBId: players[3].id },
    ];
    const pairings = component.manualPairings;
    component.startManualStage();
    expect(storeMock.addStage).toHaveBeenCalledWith('single-elimination', 2, 3, 'manual', pairings);
    expect(component.manualPairings).toEqual([]);
  });

  it('preserves exact manual qualifiers matchups when confirming the elimination', () => {
    const component = TestBed.createComponent(TournamentComponent).componentInstance;
    component.qualificationPairingMode = 'manual';
    component.qualifiedIds = ['p1', 'p2'];
    component.manualSeedIds = ['p1', 'p2'];
    component.previewSeedIds = ['p1', 'p2'];
    component.tieDecisionConfirmed = true;
    component.previewPairings = [{ playerAId: 'p2', playerBId: 'p1' }];
    component.createElimination();
    expect(component.previewOpen).toBe(true);
    expect(component.previewMatchups[0]).toMatchObject({ playerA: 'Bia', playerB: 'Ana' });
    component.createElimination();
    expect(storeMock.createEliminationFromSwiss).toHaveBeenCalledWith(
      'swiss-1', ['p1', 'p2'], 'standings', ['p1', 'p2'], 2, 'manual', [{ playerAId: 'p2', playerBId: 'p1' }],
    );
  });

  it('opens and confirms manual Swiss round pairs after the previous round completes', () => {
    const fixture = TestBed.createComponent(TournamentComponent);
    const component = fixture.componentInstance;
    const stage = tournament().stages[0];
    stage.pairingMode = 'manual';
    component.nextRound(stage.id);
    expect(component.swissRoundDraftStageId).toBe(stage.id);
    component.manualPairings = [
      { playerAId: 'p1', playerBId: 'p3' },
      { playerAId: 'p2', playerBId: 'p4' },
    ];
    const pairs = component.manualPairings;
    component.confirmManualSwissRound();
    expect(storeMock.startManualSwissRound).toHaveBeenCalledWith(stage.id, pairs);
    expect(component.swissRoundDraftStageId).toBe('');
  });

  it('does not offer a previous bye recipient when Swiss participants without byes remain', () => {
    const component = TestBed.createComponent(TournamentComponent).componentInstance;
    const stage = tournament().stages[0];
    stage.participantIds = ['p1', 'p2', 'p3'];
    stage.rounds[0].matches = [
      { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 2, scoreB: 0, winnerId: 'p1', status: 'completed' },
      { id: 'bye', playerAId: 'p3', playerBId: null, scoreA: 0, scoreB: 0, winnerId: 'p3', status: 'bye' },
    ];
    component.swissRoundDraftStageId = stage.id;
    component.manualPairings = [
      { playerAId: null, playerBId: null },
      { playerAId: 'p1', playerBId: 'p2' },
    ];
    expect(component.availablePairingPlayers(0, 'a')).toEqual([]);
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
