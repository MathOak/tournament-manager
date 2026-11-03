import { TestBed } from '@angular/core/testing';
import { TournamentStatsComponent } from './tournament-stats.component';

describe('TournamentStatsComponent', () => {
  it('renders all three provided counts', async () => {
    await TestBed.configureTestingModule({ imports: [TournamentStatsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(TournamentStatsComponent);
    fixture.componentRef.setInput('players', 12);
    fixture.componentRef.setInput('liveMatches', 2);
    fixture.componentRef.setInput('completedSeries', 8);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('12'); expect(text).toContain('Jogadores');
    expect(text).toContain('2'); expect(text).toContain('Ao vivo');
    expect(text).toContain('8'); expect(text).toContain('Séries concluídas');
  });
});
