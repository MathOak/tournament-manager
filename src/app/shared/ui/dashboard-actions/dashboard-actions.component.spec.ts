import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardActionsComponent } from './dashboard-actions.component';

describe('DashboardActionsComponent', () => {
  async function setup(displayMode: boolean, links: Record<string, string> = {}) {
    await TestBed.configureTestingModule({ imports: [DashboardActionsComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(DashboardActionsComponent);
    fixture.componentRef.setInput('displayMode', displayMode);
    for (const [name, value] of Object.entries(links)) fixture.componentRef.setInput(name, value);
    const request = vi.fn();
    fixture.componentInstance.fullscreenRequested.subscribe(request);
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, request };
  }

  it('links to the given display route outside display mode', async () => {
    const { element } = await setup(false, { displayLink: '/display/brackets' });
    const hrefs = Array.from(element.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/display/brackets']);
  });

  it('emits fullscreen requests and exits to the given route in display mode', async () => {
    const { element, request } = await setup(true, { exitLink: '/brackets' });
    element.querySelector('button')!.click();
    expect(request).toHaveBeenCalledOnce();
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/brackets');
    expect(element.textContent).toContain('Sair do telão');
  });
});
