import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createEmptyTournament } from '../../../../domain/tournament.model';
import { DashboardHeroComponent } from './dashboard-hero.component';

describe('DashboardHeroComponent', () => {
  it('renders the event summary and emits fullscreen requests in display mode', async () => {
    await TestBed.configureTestingModule({ imports: [DashboardHeroComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(DashboardHeroComponent);
    const tournament = createEmptyTournament();
    tournament.name = 'Arena Cup'; tournament.game = 'Arena'; tournament.players = [{ id: 'p1', displayName: 'Ana' }];
    fixture.componentRef.setInput('tournament', tournament);
    fixture.componentRef.setInput('completedSeries', 3);
    fixture.componentRef.setInput('displayMode', true);
    const request = vi.fn(); fixture.componentInstance.fullscreenRequested.subscribe(request);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Arena Cup');
    expect(element.textContent).toContain('3 séries concluídas');
    (element.querySelector('button') as HTMLButtonElement).click();
    expect(request).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('Sair do telão');
  });
});
