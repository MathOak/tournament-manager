import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TournamentStore } from '../../core/tournament-store.service';
import { createEmptyTournament } from '../../domain/tournament.model';
import { PlayersComponent } from './players.component';

describe('PlayersComponent', () => {
  const tournament = signal(createEmptyTournament());
  let storeMock: TournamentStore;

  beforeEach(async () => {
    tournament.set(createEmptyTournament());
    storeMock = {
      tournament: tournament.asReadonly(),
      playerCount: computed(() => tournament().players.length),
      addPlayer: vi.fn((name: string, handle = '') => {
        const cleanName = name.trim();
        if (!cleanName || tournament().players.some((player) => player.displayName.toLowerCase() === cleanName.toLowerCase())) return false;
        const player = { id: `p${tournament().players.length + 1}`, displayName: cleanName, ...(handle.trim() ? { gameHandle: handle.trim() } : {}) };
        tournament.update((current) => ({ ...current, players: [...current.players, player] }));
        return true;
      }),
      removePlayer: vi.fn((id: string) => tournament.update((current) => ({ ...current, players: current.players.filter((player) => player.id !== id) }))),
      exportJson: vi.fn(() => JSON.stringify(tournament())),
      importJson: vi.fn(() => true),
      notice: signal(''),
    } as unknown as TournamentStore;

    await TestBed.configureTestingModule({
      imports: [PlayersComponent],
      providers: [{ provide: TournamentStore, useValue: storeMock }],
    }).compileComponents();
  });

  it('renders the empty participant state and updates the list after successful submission', async () => {
    const fixture = TestBed.createComponent(PlayersComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nenhum jogador cadastrado ainda');

    const name = fixture.nativeElement.querySelector('#player-name') as HTMLInputElement;
    const handle = fixture.nativeElement.querySelector('#player-handle') as HTMLInputElement;
    const component = fixture.componentInstance;
    component.name = ' Ana ';
    component.handle = ' A#1 ';
    component.addPlayer();
    fixture.detectChanges();

    expect(storeMock.addPlayer).toHaveBeenCalledWith(' Ana ', ' A#1 ');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ana');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('A#1');
    expect(name.value).toBe('');
    expect(handle.value).toBe('');
  });

  it('does not clear fields after the store rejects a duplicate or blank name', async () => {
    const fixture = TestBed.createComponent(PlayersComponent);
    const component = fixture.componentInstance;
    component.name = 'Ana';
    component.handle = 'handle';
    vi.mocked(storeMock.addPlayer).mockReturnValue(false);

    component.addPlayer();

    expect(component.name).toBe('Ana');
    expect(component.handle).toBe('handle');
  });

  it('only removes a participant after explicit confirmation', () => {
    const fixture = TestBed.createComponent(PlayersComponent);
    const component = fixture.componentInstance;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removePlayer('p1');
    expect(confirmSpy).toHaveBeenCalled();
    expect(storeMock.removePlayer).not.toHaveBeenCalled();
    confirmSpy.mockReturnValue(true);
    component.removePlayer('p1');
    expect(storeMock.removePlayer).toHaveBeenCalledWith('p1');
    confirmSpy.mockRestore();
  });
});
