import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { TournamentStore } from './core/tournament-store.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly store = inject(TournamentStore);
  private readonly router = inject(Router);
  readonly displayMode = signal(this.router.url.startsWith('/display'));
  readonly theme = signal<'dark' | 'light'>(this.loadTheme());

  constructor() {
    this.applyTheme(this.theme());
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.displayMode.set((event as NavigationEnd).urlAfterRedirects.startsWith('/display'));
    });
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
    localStorage.setItem('tournament-manager-theme', next);
  }

  private loadTheme(): 'dark' | 'light' {
    if (typeof localStorage === 'undefined') return 'dark';
    return localStorage.getItem('tournament-manager-theme') === 'light' ? 'light' : 'dark';
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    if (typeof document !== 'undefined') document.documentElement.dataset['theme'] = theme;
  }
}
