import { TestBed } from '@angular/core/testing';
import { AppFooterComponent } from './app-footer.component';

describe('AppFooterComponent', () => {
  it('renders the local persistence notice', async () => {
    await TestBed.configureTestingModule({ imports: [AppFooterComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Persistência neste navegador');
  });
});
