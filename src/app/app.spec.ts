import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from './core/app-config';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('tournament-manager-theme');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the tournament navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav')?.textContent).toContain('Dashboard');
    expect(compiled.querySelector('nav')?.textContent).toContain('Chaves');
    expect(compiled.querySelector('nav')?.textContent).toContain('Admin');
  });

  it('sets the route title with the configured event name', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/players');
    fixture.detectChanges();
    expect(document.title).toBe(`Jogadores | ${DEFAULT_APP_CONFIG.eventName}`);
  });

  it('uses an overridden event name in the route title', async () => {
    const config = {
      eventName: 'Copa X',
      eventShortName: 'CX',
      eventNameParts: ['Copa', 'X'] as const,
    };
    TestBed.overrideProvider(APP_CONFIG, { useValue: config });
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/players');
    fixture.detectChanges();
    expect(document.title).toBe('Jogadores | Copa X');
  });

  it('toggles and persists the theme preference', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.theme()).toBe('dark');
    app.toggleTheme();
    expect(app.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('tournament-manager-theme')).toBe('light');
    app.toggleTheme();
    expect(app.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
