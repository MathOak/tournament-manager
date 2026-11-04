import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TournamentStore } from '../../core/tournament-store.service';
import { Tournament, createEmptyTournament } from '../../domain/tournament.model';
import { BracketDisplayComponent } from './bracket-display.component';

function sampleTournament(): Tournament {
  const tournament = createEmptyTournament();
  tournament.name = 'Copa de Teste';
  tournament.game = 'Jogo de Teste';
  tournament.players = [
    { id: 'p1', displayName: 'Ana' },
    { id: 'p2', displayName: 'Bia' },
    { id: 'p3', displayName: 'Caio' },
    { id: 'p4', displayName: 'Duda' },
  ];
  tournament.stages = [{
    id: 'stage-1',
    name: 'Playoffs',
    format: 'single-elimination',
    bestOf: 3,
    status: 'in-progress',
    totalRounds: 2,
    participantIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [
      { id: 'round-1', number: 1, matches: [
        { id: 'm1', playerAId: 'p1', playerBId: 'p2', scoreA: 2, scoreB: 0, winnerId: 'p1', status: 'completed' },
        { id: 'm2', playerAId: 'p3', playerBId: 'p4', scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
      ] },
      { id: 'round-2', number: 2, matches: [
        { id: 'm3', playerAId: 'p1', playerBId: null, scoreA: 0, scoreB: 0, winnerId: null, status: 'pending' },
      ] },
    ],
  }];
  return tournament;
}

describe('BracketDisplayComponent', () => {
  let tournament: Tournament;
  let mockStore: TournamentStore;

  beforeEach(async () => {
    tournament = sampleTournament();
    mockStore = {
      tournament: signal(tournament),
      tournaments: signal([tournament]),
      selectedTournamentId: signal(tournament.id),
      ready: signal(true),
      selectTournament: vi.fn(() => true),
      createTournament: vi.fn(),
    } as unknown as TournamentStore;
    await TestBed.configureTestingModule({
      imports: [BracketDisplayComponent],
      providers: [provideRouter([]), { provide: TournamentStore, useValue: mockStore }],
    }).compileComponents();
  });

  it('renders the selected championship and elimination rounds as a connected bracket', () => {
    const fixture = TestBed.createComponent(BracketDisplayComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-select-menu .select-trigger')?.textContent).toContain('Copa de Teste');
    expect(element.querySelectorAll('app-bracket-round-column')).toHaveLength(2);
    expect(element.querySelectorAll('.bracket-game')).toHaveLength(3);
    expect(element.querySelector('.bracket-connectors path')).toBeTruthy();
    expect(element.textContent).toContain('Semifinal');
    expect(element.textContent).toContain('Final');
    expect(element.textContent).toContain('Vencedor de Semifinal · Jogo 2');
  });

  it('labels winner, score and bye slots accessibly', () => {
    const stage = tournament.stages[0];
    stage.rounds[0].matches[1].status = 'bye';
    stage.rounds[0].matches[1].winnerId = 'p3';
    stage.rounds[0].matches[1].playerBId = null;
    const fixture = TestBed.createComponent(BracketDisplayComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.player-winner')?.textContent).toContain('Ana');
    expect(element.textContent).toContain('2');
    expect(element.textContent).toContain('Avança por bye');
  });

  it('scales match cards and connectors for a 4K viewport', () => {
    const fixture = TestBed.createComponent(BracketDisplayComponent);
    const component = fixture.componentInstance;
    component.viewportSize.set({ width: 3840, height: 2160 });

    expect(component.matchHeight()).toBe(176);
    expect(component.connectorWidth()).toBe(68);
    expect(component.boardMinWidth()).toBe(496);
  });

  it('shows only elimination stages and hides presentation navigation when embedded', () => {
    tournament.stages.push({
      id: 'swiss', name: 'Sistema suíço', format: 'swiss', bestOf: 3, status: 'completed', totalRounds: 1,
      rounds: [{ id: 'swiss-round', number: 1, matches: [] }],
    });
    const fixture = TestBed.createComponent(BracketDisplayComponent);
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-bracket-round-column')).toHaveLength(2);
    expect(element.querySelector('nav[aria-label="Navegação do campeonato"]')).toBeNull();
    expect(element.querySelector('.bracket-fullscreen-button')).toBeNull();
    expect(element.querySelectorAll('app-select-menu')).toHaveLength(1);
  });

  it('reports a graceful message when fullscreen is unavailable', () => {
    const fixture = TestBed.createComponent(BracketDisplayComponent);
    const component = fixture.componentInstance;
    const original = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen');
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: undefined });
    component.toggleFullscreen();
    expect(component.fullscreenNotice()).toContain('não está disponível');
    if (original) Object.defineProperty(document.documentElement, 'requestFullscreen', original);
    else Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
  });
});
