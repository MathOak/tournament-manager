import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardActionsComponent } from './dashboard-actions.component';

describe('DashboardActionsComponent', () => {
  async function setup(displayMode: boolean) {
    await TestBed.configureTestingModule({ imports: [DashboardActionsComponent], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(DashboardActionsComponent);
    fixture.componentRef.setInput('displayMode', displayMode);
    const request = vi.fn();
    fixture.componentInstance.fullscreenRequested.subscribe(request);
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, request };
  }

  it('links to display mode and admin outside display mode', async () => {
    const { element } = await setup(false);
    const hrefs = Array.from(element.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/display', '/admin']);
  });

  it('emits fullscreen requests and offers exit in display mode', async () => {
    const { element, request } = await setup(true);
    element.querySelector('button')!.click();
    expect(request).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('Sair do telão');
  });
});
