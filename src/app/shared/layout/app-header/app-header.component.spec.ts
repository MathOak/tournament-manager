import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppHeaderComponent } from './app-header.component';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/app-config';

describe('AppHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHeaderComponent],
      providers: [provideRouter([]), { provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG }],
    }).compileComponents();
  });

  it('renders the shared navigation and emits the theme action', () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.componentRef.setInput('theme', 'dark');
    const emitted = vi.fn();
    fixture.componentInstance.themeToggle.subscribe(emitted);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('nav')?.textContent).toContain('Chaves');
    expect(element.querySelector('.brand')?.textContent).toContain(DEFAULT_APP_CONFIG.eventName);
    expect(element.querySelector('.brand')?.getAttribute('aria-label')).toBe(`${DEFAULT_APP_CONFIG.eventName} — início`);
    expect(element.textContent).toContain('Dados locais');
    (element.querySelector('.theme-toggle') as HTMLButtonElement).click();
    expect(emitted).toHaveBeenCalledOnce();
    expect(element.querySelector('.theme-toggle')?.getAttribute('aria-label')).toBe('Ativar tema claro');
  });

  it('renders the configured name parts and short name', () => {
    const config = {
      eventName: 'Copa X',
      eventShortName: 'CX',
      eventNameParts: ['Copa', 'X'] as const,
    };
    TestBed.overrideProvider(APP_CONFIG, { useValue: config });
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.componentRef.setInput('theme', 'dark');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.brand')?.textContent).toContain('Copa X');
    expect(element.querySelector('.brand-mark')?.textContent).toBe('CX');
    expect(element.querySelector('.brand')?.getAttribute('aria-label')).toBe('Copa X — início');
  });
});
