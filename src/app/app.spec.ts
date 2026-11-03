import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('tournament-manager-theme');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
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
