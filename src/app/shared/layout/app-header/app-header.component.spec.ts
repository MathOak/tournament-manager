import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppHeaderComponent } from './app-header.component';

describe('AppHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppHeaderComponent], providers: [provideRouter([])] }).compileComponents();
  });

  it('renders the shared navigation and emits the theme action', () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.componentRef.setInput('theme', 'dark');
    const emitted = vi.fn();
    fixture.componentInstance.themeToggle.subscribe(emitted);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('nav')?.textContent).toContain('Chaves');
    expect(element.textContent).toContain('Dados locais');
    (element.querySelector('.theme-toggle') as HTMLButtonElement).click();
    expect(emitted).toHaveBeenCalledOnce();
    expect(element.querySelector('.theme-toggle')?.getAttribute('aria-label')).toBe('Ativar tema claro');
  });
});
