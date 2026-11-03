import { Component, HostListener, Input, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TournamentStore } from '../../core/tournament-store.service';
import { Match, Stage } from '../../domain/tournament.model';

const MAX_MATCH_HEIGHT = 176;
const MIN_COLUMN_WIDTH = 214;

@Component({
  selector: 'app-bracket-display',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
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

  selectTournament(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!this.store.selectTournament(id)) return;
    this.selectedStageId.set(this.eliminationStages()[0]?.id ?? '');
    this.selectedRoundIndex.set(0);
  }

  selectStage(event: Event): void {
    this.selectedStageId.set((event.target as HTMLSelectElement).value);
    this.selectedRoundIndex.set(0);
  }

  createTournament(): void {
    this.store.createTournament();
    this.selectedStageId.set('');
    this.selectedRoundIndex.set(0);
  }

  playerName(playerId: string | null): string {
    return this.store.tournament().players.find((player) => player.id === playerId)?.displayName ?? 'A definir';
  }

  participantLabel(stage: Stage, roundIndex: number, matchIndex: number, side: 'a' | 'b'): string {
    const match = stage.rounds[roundIndex]?.matches[matchIndex];
    if (!match) return 'A definir';
    const playerId = side === 'a' ? match.playerAId : match.playerBId;
    if (playerId) return this.playerName(playerId);
    if (match.status === 'bye' && (match.playerAId || match.playerBId)) return 'BYE';
    if (roundIndex === 0) return 'A definir';
    const sourceRound = stage.rounds[roundIndex - 1];
    const sourceMatch = sourceRound?.matches[matchIndex * 2 + (side === 'a' ? 0 : 1)];
    if (!sourceMatch) return 'A definir';
    return `Vencedor de ${this.roundLabel(stage, roundIndex - 1)} · Jogo ${matchIndex * 2 + (side === 'a' ? 1 : 2)}`;
  }

  roundLabel(stage: Stage, roundIndex: number): string {
    const matchCount = stage.rounds[roundIndex]?.matches.length ?? 0;
    const participants = matchCount * 2;
    if (participants === 2) return 'Final';
    if (participants === 4) return 'Semifinal';
    if (participants === 8) return 'Quartas de final';
    if (participants === 16) return 'Oitavas de final';
    return `Rodada de ${participants}`;
  }

  roundTopMargin(roundIndex: number): number {
    return ((2 ** roundIndex) - 1) * (this.matchHeight() + this.baseGap()) / 2;
  }

  roundGap(roundIndex: number): number {
    return (2 ** roundIndex) * (this.matchHeight() + this.baseGap()) - this.matchHeight();
  }

  connectorPaths(stage: Stage, roundIndex: number): string[] {
    const currentRound = stage.rounds[roundIndex];
    const nextRound = stage.rounds[roundIndex + 1];
    if (!currentRound || !nextRound) return [];
    return nextRound.matches.map((_, targetIndex) => {
      const firstSource = targetIndex * 2;
      const yA = this.matchCenter(roundIndex, firstSource);
      const yB = this.matchCenter(roundIndex, firstSource + 1);
      const yTarget = this.matchCenter(roundIndex + 1, targetIndex);
      const junction = Math.round(this.connectorWidth() * 0.4);
      return `M 0 ${yA} H ${junction} V ${yTarget} H ${this.connectorWidth()} M 0 ${yB} H ${junction} V ${yTarget}`;
    });
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

  private matchCenter(roundIndex: number, matchIndex: number): number {
    return this.roundTopMargin(roundIndex) + this.matchHeight() / 2 + matchIndex * (this.roundGap(roundIndex) + this.matchHeight());
  }

  private readTheme(): 'dark' | 'light' {
    if (typeof document !== 'undefined' && document.documentElement.dataset['theme']) {
      return document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
    }
    return typeof localStorage !== 'undefined' && localStorage.getItem('tournament-manager-theme') === 'light' ? 'light' : 'dark';
  }
}
