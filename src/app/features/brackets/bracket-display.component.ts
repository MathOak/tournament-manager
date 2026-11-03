import { Component, HostListener, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TournamentStore } from '../../core/tournament-store.service';
import { Stage } from '../../domain/tournament.model';
import { AppHeaderComponent } from '../../shared/layout/app-header/app-header.component';
import { BracketConnectorsComponent } from './components/bracket-connectors/bracket-connectors.component';
import { BracketRoundColumnComponent } from './components/bracket-round-column/bracket-round-column.component';
import { BracketRoundTabsComponent } from './components/bracket-round-tabs/bracket-round-tabs.component';
import { BracketEventSummaryComponent } from './components/bracket-event-summary/bracket-event-summary.component';
import { BracketLegendComponent } from './components/bracket-legend/bracket-legend.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { BracketToolbarComponent } from './components/bracket-toolbar/bracket-toolbar.component';

const MAX_MATCH_HEIGHT = 176;
const MIN_COLUMN_WIDTH = 214;

@Component({
  selector: 'app-bracket-display',
  standalone: true,
  imports: [RouterLink, AppHeaderComponent, BracketConnectorsComponent, BracketRoundColumnComponent, BracketRoundTabsComponent, BracketEventSummaryComponent, BracketLegendComponent, EmptyStateComponent, BracketToolbarComponent],
  templateUrl: './bracket-display.component.html',
})
export class BracketDisplayComponent {
  @Input() embedded = false;

  readonly store = inject(TournamentStore);
  readonly eliminationStages = computed(() => this.store.tournament().stages.filter((stage) => stage.format === 'single-elimination'));
  readonly selectedStageId = signal('');
  readonly selectedRoundIndex = signal(0);
  readonly fullscreen = signal(false);
  readonly fullscreenNotice = signal('');
  readonly theme = signal<'dark' | 'light'>(this.readTheme());
  readonly viewportSize = signal({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  });
  readonly selectedStage = computed(() => this.eliminationStages().find((stage) => stage.id === this.selectedStageId()) ?? this.eliminationStages()[0]);
  readonly connectorWidth = computed(() => Math.round(Math.min(68, Math.max(34, this.viewportSize().width * 0.018))));
  readonly boardMinWidth = computed(() => {
    const roundCount = this.selectedStage()?.rounds.length ?? 0;
    return Math.max(1, roundCount) * MIN_COLUMN_WIDTH + Math.max(0, roundCount - 1) * this.connectorWidth();
  });
  readonly matchHeight = computed(() => {
    const count = this.selectedStage()?.rounds[0]?.matches.length ?? 0;
    if (!count) return MAX_MATCH_HEIGHT;
    const { width, height } = this.viewportSize();
    const fixedContentHeight = width < 1000 ? 340 : width >= 2560 ? 300 : 254;
    return Math.floor(Math.min(MAX_MATCH_HEIGHT, Math.max(48, (height - fixedContentHeight) / (count + 0.28 * (count - 1)))));
  });
  readonly baseGap = computed(() => Math.round(this.matchHeight() * 0.28));
  readonly boardHeight = computed(() => {
    const count = this.selectedStage()?.rounds[0]?.matches.length ?? 0;
    return count ? count * this.matchHeight() + (count - 1) * this.baseGap() : this.matchHeight();
  });

  constructor() {
    this.syncFullscreen();
  }

  selectTournament(id: string): void {
    if (!this.store.selectTournament(id)) return;
    this.selectedStageId.set(this.eliminationStages()[0]?.id ?? '');
    this.selectedRoundIndex.set(0);
  }

  selectStage(stageId: string): void {
    this.selectedStageId.set(stageId);
    this.selectedRoundIndex.set(0);
  }

  createTournament(): void {
    this.store.createTournament();
    this.selectedStageId.set('');
    this.selectedRoundIndex.set(0);
  }

  roundTopMargin(roundIndex: number): number {
    return ((2 ** roundIndex) - 1) * (this.matchHeight() + this.baseGap()) / 2;
  }

  roundGap(roundIndex: number): number {
    return (2 ** roundIndex) * (this.matchHeight() + this.baseGap()) - this.matchHeight();
  }

  focusRound(roundIndex: number): void {
    this.selectedRoundIndex.set(roundIndex);
    document.getElementById(`bracket-round-${roundIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  toggleFullscreen(): void {
    this.fullscreenNotice.set('');
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => this.fullscreenNotice.set('Não foi possível sair do modo de tela cheia.'));
      return;
    }
    const request = document.documentElement.requestFullscreen;
    if (!request) {
      this.fullscreenNotice.set('Tela cheia não está disponível neste navegador.');
      return;
    }
    void request.call(document.documentElement).catch(() => {
      this.fullscreenNotice.set('O navegador não permitiu ativar a tela cheia. Tente novamente pelo botão.');
    });
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (typeof document !== 'undefined') document.documentElement.dataset['theme'] = next;
    localStorage.setItem('tournament-manager-theme', next);
  }

  @HostListener('document:fullscreenchange')
  syncFullscreen(): void {
    this.fullscreen.set(typeof document !== 'undefined' && !!document.fullscreenElement);
  }

  @HostListener('window:resize')
  updateViewportSize(): void {
    if (typeof window !== 'undefined') this.viewportSize.set({ width: window.innerWidth, height: window.innerHeight });
  }

  private readTheme(): 'dark' | 'light' {
    if (typeof document !== 'undefined' && document.documentElement.dataset['theme']) {
      return document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
    }
    return typeof localStorage !== 'undefined' && localStorage.getItem('tournament-manager-theme') === 'light' ? 'light' : 'dark';
  }
}
