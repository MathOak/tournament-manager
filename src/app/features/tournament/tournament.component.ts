import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateStandings, calculateTournamentRecords } from '../../domain/tournament-engine';
import { BestOf, MatchPairing, PairingMode, SeedMode, Stage, StageFormat } from '../../domain/tournament.model';
import { TournamentStore } from '../../core/tournament-store.service';
import { PageHeadingComponent } from '../../shared/ui/page-heading/page-heading.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { SelectMenuComponent, SelectMenuOption } from '../../shared/ui/select-menu/select-menu.component';
import { GAME_CATALOG, gameById, gameForLegacyName } from '../../domain/game-catalog';
import { generateAutomaticEliminationPairings, validateEliminationPairings, validateSwissPairings } from '../../domain/tournament-engine';

interface PlayerOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-tournament-setup',
  standalone: true,
  imports: [FormsModule, PageHeadingComponent, StatusBadgeComponent, SelectMenuComponent],
  templateUrl: './tournament.component.html',
  styleUrl: './tournament.component.css',
})
export class TournamentComponent {
  readonly store = inject(TournamentStore);
  readonly formatOptions: SelectMenuOption[] = [
    { value: 'swiss', title: 'Sistema suíço' },
    { value: 'single-elimination', title: 'Eliminação simples' },
  ];
  readonly pairingModeOptions: SelectMenuOption[] = [
    { value: 'automatic', title: 'Pareamento automático' },
    { value: 'manual', title: 'Montar confrontos manualmente' },
  ];
  readonly gameOptions: SelectMenuOption[] = GAME_CATALOG.map((game) => ({ value: game.id, title: game.label }));
  readonly topCountOptions: SelectMenuOption[] = [2, 4, 8, 16].map((count) => ({ value: String(count), title: `Top ${count}` }));
  readonly seedModeOptions: SelectMenuOption[] = [
    { value: 'standings', title: 'Seguir classificação suíça' },
    { value: 'random', title: 'Sortear classificados' },
    { value: 'manual', title: 'Ajustar ordem manualmente' },
  ];
  qualificationPairingMode: PairingMode = 'automatic';
  tournamentName = this.store.tournament().name;
  gameId = this.store.tournament().gameId ?? gameForLegacyName(this.store.tournament().game)?.id ?? '';
  format: StageFormat = 'swiss';
  pairingMode: PairingMode = 'automatic';
  manualPairings: MatchPairing[] = [];
  manualStagePreviewOpen = false;
  bestOf: BestOf = 2;
  rounds = 3;
  sourceStageId = '';
  topCount = 4;
  qualifiedIds: string[] = [];
  seedMode: SeedMode = 'standings';
  manualSeedIds: string[] = [];
  qualificationBestOf: BestOf = 2;
  tieDecisionConfirmed = false;
  previewOpen = false;
  previewSeedIds: string[] = [];
  previewPairings: MatchPairing[] = [];

  get selectedGame() {
    return gameById(this.gameId);
  }

  get bestOfOptions(): SelectMenuOption[] {
    return (this.selectedGame?.bestOfOptions ?? []).map((bestOf) => ({ value: String(bestOf), title: `MD${bestOf}` }));
  }

  get qualificationBestOfOptions(): SelectMenuOption[] {
    const options = gameById(this.store.tournament().gameId)?.bestOfOptions ?? [1, 2, 3, 5];
    return options.map((bestOf) => ({ value: String(bestOf), title: `MD${bestOf}` }));
  }

  get gameLocked(): boolean {
    return this.store.tournament().stages.length > 0 && !!this.store.tournament().gameId;
  }

  constructor() {
    effect(() => {
      const stages = this.completedSwissStages;
      if (stages.length && !this.sourceStageId) {
        this.sourceStageId = stages[0].id;
        this.qualificationBestOf = 2;
        this.selectTopClassified();
      }
    });
  }

  get completedSwissStages(): Stage[] {
    return this.store.tournament().stages.filter((stage) => stage.format === 'swiss' &&
      stage.rounds.length >= stage.totalRounds && !stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending' || match.status === 'in-progress')));
  }

  get swissStageOptions(): SelectMenuOption[] {
    return this.completedSwissStages.map((stage) => ({ value: stage.id, title: stage.name }));
  }

  get sourceSwiss(): Stage | undefined {
    return this.completedSwissStages.find((stage) => stage.id === this.sourceStageId) ?? this.completedSwissStages[0];
  }

  get swissStandings() {
    if (!this.sourceSwiss) return [];
    const players = this.store.tournament().players;
    const eligible = this.sourceSwiss.participantIds
      ? players.filter((player) => this.sourceSwiss!.participantIds!.includes(player.id))
      : players;
    return calculateStandings(this.sourceSwiss, eligible);
  }

  get selectedBoundaryTie(): boolean {
    if (this.qualifiedIds.length < 1 || this.qualifiedIds.length >= this.swissStandings.length) return false;
    const sorted = this.swissStandings;
    const selectedPoints = sorted.filter((entry) => this.qualifiedIds.includes(entry.player.id)).map((entry) => entry.points);
    const unselectedPoints = sorted.filter((entry) => !this.qualifiedIds.includes(entry.player.id)).map((entry) => entry.points);
    return Math.min(...selectedPoints) === Math.max(...unselectedPoints);
  }

  saveDetails(): boolean {
    return this.store.updateTournamentDetails(this.tournamentName, this.gameId);
  }

  selectGame(gameId: string): void {
    this.gameId = gameId;
    const available = this.selectedGame?.bestOfOptions ?? [];
    if (!available.includes(this.bestOf)) this.bestOf = (available[0] ?? 2) as BestOf;
    if (!available.includes(this.qualificationBestOf)) this.qualificationBestOf = (available[0] ?? 2) as BestOf;
  }

  setBestOf(value: string): void {
    this.bestOf = Number(value) as BestOf;
  }

  setQualificationBestOf(value: string): void {
    this.qualificationBestOf = Number(value) as BestOf;
  }

  createStage(): void {
    if (!this.selectedGame) {
      this.store.notice.set('Selecione um jogo antes de criar a etapa.');
      return;
    }
    if (this.pairingMode === 'manual') {
      this.initializeManualPairings();
      this.manualStagePreviewOpen = true;
      return;
    }
    if (!this.saveDetails()) return;
    this.store.addStage(this.format, this.bestOf, this.rounds, 'automatic');
  }

  initializeManualPairings(): void {
    const participants = this.store.tournament().players;
    if (this.format === 'single-elimination') {
      this.manualPairings = generateAutomaticEliminationPairings(participants.map((player) => player.id));
      return;
    }
    const shuffled = participants.slice().sort(() => Math.random() - 0.5);
    this.manualPairings = Array.from({ length: Math.ceil(shuffled.length / 2) }, (_, index) => ({
      playerAId: shuffled[index * 2]?.id ?? null,
      playerBId: shuffled[index * 2 + 1]?.id ?? null,
    }));
  }

  get manualPairingError(): string | null {
    const participants = this.store.tournament().players;
    if (this.manualStagePreviewOpen && this.format === 'swiss') {
      const draft: Stage = {
        id: 'draft', name: 'Rascunho suíço', format: 'swiss', bestOf: this.bestOf,
        scoreMode: this.selectedGame?.category, pairingMode: this.pairingMode, status: 'ready', rounds: [],
        totalRounds: Math.max(1, this.rounds), participantIds: participants.map((player) => player.id),
      };
      return validateSwissPairings(draft, participants, this.manualPairings);
    }
    const swissDraftStage = this.swissDraftStage;
    if (swissDraftStage) return validateSwissPairings(swissDraftStage, participants, this.manualPairings);
    if (this.format === 'single-elimination') return validateEliminationPairings(participants.map((player) => player.id), this.manualPairings);
    const draft: Stage = {
      id: 'draft', name: 'Rascunho suíço', format: 'swiss', bestOf: this.bestOf,
      scoreMode: this.selectedGame?.category, pairingMode: this.pairingMode, status: 'ready', rounds: [],
      totalRounds: Math.max(1, this.rounds), participantIds: participants.map((player) => player.id),
    };
    return validateSwissPairings(draft, participants, this.manualPairings);
  }

  get previewPairingError(): string | null {
    return this.qualificationPairingMode === 'manual'
      ? validateEliminationPairings(this.previewSeedIds, this.previewPairings)
      : null;
  }

  get swissDraftStage(): Stage | undefined {
    return this.store.tournament().stages.find((stage) => stage.id === this.swissRoundDraftStageId);
  }

  get swissByeHistoryNames(): string[] {
    return this.swissDraftStage ? this.swissByeHistory(this.swissDraftStage).map((id) => this.playerName(id)) : [];
  }

  availablePairingPlayers(pairingIndex: number, side: 'a' | 'b'): PlayerOption[] {
    return this.availablePlayersForPairings(this.manualPairings, pairingIndex, side, this.swissDraftStage?.participantIds);
  }

  private availablePlayersForPairings(pairings: MatchPairing[], pairingIndex: number, side: 'a' | 'b', eligibleIds?: string[]): PlayerOption[] {
    const currentId = side === 'a' ? pairings[pairingIndex]?.playerAId : pairings[pairingIndex]?.playerBId;
    const pairing = pairings[pairingIndex];
    const swissDraftStage = this.swissDraftStage;
    const isSwissByeSlot = !!swissDraftStage && !!pairing && (!pairing.playerAId || !pairing.playerBId) &&
      (eligibleIds ?? swissDraftStage.participantIds ?? []).length % 2 === 1;
    const usedIds = new Set(pairings.flatMap((pair, index) => [
      ...(index === pairingIndex ? [] : [pair.playerAId, pair.playerBId]),
      ...(index === pairingIndex && side === 'a' ? [pair.playerBId] : []),
      ...(index === pairingIndex && side === 'b' ? [pair.playerAId] : []),
    ]).filter((id): id is string => !!id));
    const players = this.store.tournament().players
      .filter((player) => !eligibleIds || eligibleIds.includes(player.id))
      .filter((player) => !usedIds.has(player.id) || player.id === currentId);
    const byeCounts = new Map((eligibleIds ?? swissDraftStage?.participantIds ?? []).map((id) => [id, 0]));
    if (swissDraftStage) {
      for (const round of swissDraftStage.rounds) {
        for (const match of round.matches) {
          if (match.status === 'bye' && match.winnerId) byeCounts.set(match.winnerId, (byeCounts.get(match.winnerId) ?? 0) + 1);
        }
      }
    }
    const minimumByes = byeCounts.size ? Math.min(...byeCounts.values()) : 0;
    return players
      .filter((player) => !isSwissByeSlot || (byeCounts.get(player.id) ?? 0) === minimumByes || player.id === currentId)
      .map((player) => ({ id: player.id, label: player.displayName }));
  }

  setPairingPlayer(pairingIndex: number, side: 'a' | 'b', playerId: string): void {
    this.manualPairings = this.manualPairings.map((pair, index) => index !== pairingIndex ? pair : {
      ...pair,
      ...(side === 'a' ? { playerAId: playerId || null } : { playerBId: playerId || null }),
    });
  }

  previewPairingRows(): Array<{ index: number; pair: MatchPairing }> {
    return this.previewPairings.map((pair, index) => ({ index, pair }));
  }

  availablePreviewPairingPlayers(pairingIndex: number, side: 'a' | 'b'): PlayerOption[] {
    return this.availablePlayersForPairings(this.previewPairings, pairingIndex, side, this.previewSeedIds);
  }

  setPreviewPairingPlayer(pairingIndex: number, side: 'a' | 'b', playerId: string): void {
    this.previewPairings = this.previewPairings.map((pair, index) => index !== pairingIndex ? pair : {
      ...pair,
      ...(side === 'a' ? { playerAId: playerId || null } : { playerBId: playerId || null }),
    });
  }

  pairingRows(): Array<{ index: number; pair: MatchPairing }> {
    return this.manualPairings.map((pair, index) => ({ index, pair }));
  }

  swissByeHistory(stage: Stage): string[] {
    return stage.rounds.flatMap((round) => round.matches
      .filter((match) => match.status === 'bye' && match.winnerId)
      .map((match) => match.winnerId!));
  }

  startManualStage(): void {
    const error = this.manualPairingError;
    if (error) {
      this.store.notice.set(error);
      return;
    }
    if (!this.saveDetails()) return;
    if (this.store.addStage(this.format, this.bestOf, this.rounds, 'manual', this.manualPairings)) {
      this.manualPairings = [];
      this.pairingMode = 'automatic';
      this.manualStagePreviewOpen = false;
    }
  }

  cancelManualStage(): void {
    this.manualPairings = [];
    this.pairingMode = 'automatic';
    this.manualStagePreviewOpen = false;
  }

  nextRound(stageId: string): void {
    const stage = this.store.tournament().stages.find((item) => item.id === stageId);
    if (!stage) return;
    if ((stage.pairingMode ?? 'automatic') === 'manual') {
      this.swissRoundDraftStageId = stageId;
      this.initializeSwissRoundPairings(stage);
      return;
    }
    this.store.startNextSwissRound(stageId);
  }

  swissRoundDraftStageId = '';

  initializeSwissRoundPairings(stage: Stage): void {
    const activeIds = stage.participantIds ?? this.store.tournament().players.map((player) => player.id);
    const standings = calculateStandings(stage, this.store.tournament().players.filter((player) => activeIds.includes(player.id)));
    const orderedIds = standings.map((item) => item.player.id);
    const opponents = new Set(stage.rounds.flatMap((round) => round.matches
      .filter((match) => match.status === 'completed' && match.playerAId && match.playerBId)
      .map((match) => `${match.playerAId}:${match.playerBId}`)));
    const pairs: MatchPairing[] = [];
    const remaining = orderedIds.slice();
    if (remaining.length % 2) {
      const counts = new Map(orderedIds.map((id) => [id, stage.rounds.flatMap((round) => round.matches).filter((match) => match.status === 'bye' && match.winnerId === id).length]));
      const minCount = Math.min(...orderedIds.map((id) => counts.get(id) ?? 0));
      const byeIndex = remaining.findIndex((id) => (counts.get(id) ?? 0) === minCount);
      const [byeId] = remaining.splice(byeIndex, 1);
      pairs.push({ playerAId: byeId, playerBId: null });
    }
    while (remaining.length) {
      const playerAId = remaining.shift()!;
      let candidate = remaining.findIndex((id) => !opponents.has(`${playerAId}:${id}`) && !opponents.has(`${id}:${playerAId}`));
      if (candidate < 0) candidate = 0;
      const [playerBId] = remaining.splice(candidate, 1);
      pairs.push({ playerAId, playerBId });
    }
    this.manualPairings = pairs;
  }

  confirmManualSwissRound(): void {
    const stage = this.store.tournament().stages.find((item) => item.id === this.swissRoundDraftStageId);
    if (!stage) return;
    const error = validateSwissPairings(stage, this.store.tournament().players, this.manualPairings);
    if (error) {
      this.store.notice.set(error);
      return;
    }
    if (this.store.startManualSwissRound(stage.id, this.manualPairings)) {
      this.swissRoundDraftStageId = '';
      this.manualPairings = [];
    }
  }

  cancelManualSwissRound(): void {
    this.swissRoundDraftStageId = '';
    this.manualPairings = [];
  }

  removeStage(stageId: string): void {
    if (!confirm('Excluir esta etapa e todas as partidas?')) return;
    this.store.removeStage(stageId);
  }

  hasPendingMatches(stage: Stage): boolean {
    return stage.rounds.some((round) => round.matches.some((match) => match.status === 'pending' || match.status === 'in-progress'));
  }

  onSourceStageChange(stageId: string): void {
    this.sourceStageId = stageId;
    this.qualificationBestOf = 2;
    this.selectTopClassified();
  }

  selectTopClassified(): void {
    this.qualifiedIds = this.swissStandings.slice(0, Math.max(2, this.topCount)).map((entry) => entry.player.id);
    this.manualSeedIds = this.swissStandings.map((entry) => entry.player.id).filter((id) => this.qualifiedIds.includes(id));
    this.tieDecisionConfirmed = false;
    this.previewPairings = [];
  }

  toggleQualified(playerId: string, selected: boolean): void {
    this.qualifiedIds = selected ? [...this.qualifiedIds, playerId] : this.qualifiedIds.filter((id) => id !== playerId);
    this.manualSeedIds = this.swissStandings.map((entry) => entry.player.id).filter((id) => this.qualifiedIds.includes(id));
    this.tieDecisionConfirmed = false;
    this.previewOpen = false;
    this.previewPairings = [];
  }

  moveSeed(playerId: string, direction: -1 | 1): void {
    const index = this.manualSeedIds.indexOf(playerId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= this.manualSeedIds.length) return;
    const updated = this.manualSeedIds.slice();
    [updated[index], updated[target]] = [updated[target], updated[index]];
    this.manualSeedIds = updated;
    this.previewOpen = false;
    this.previewPairings = [];
  }

  createElimination(): void {
    const source = this.sourceSwiss;
    if (!source) return;
    if (this.selectedBoundaryTie && !this.tieDecisionConfirmed) return;
    if (!this.previewOpen) {
      const reuseManualPreview = this.qualificationPairingMode === 'manual' && this.previewPairings.length > 0 && this.previewSeedIds.length > 0;
      if (!reuseManualPreview) {
        const rankedIds = this.swissStandings.map((entry) => entry.player.id).filter((id) => this.qualifiedIds.includes(id));
        this.previewSeedIds = this.seedMode === 'manual' ? this.manualSeedIds.slice()
          : this.seedMode === 'random' ? rankedIds.slice().sort(() => Math.random() - 0.5) : rankedIds;
      }
      if (this.qualificationPairingMode === 'manual') {
        if (!reuseManualPreview) this.previewPairings = generateAutomaticEliminationPairings(this.previewSeedIds);
      }
      this.previewOpen = true;
      return;
    }
    if (this.store.createEliminationFromSwiss(source.id, this.qualifiedIds, this.seedMode, this.previewSeedIds, this.qualificationBestOf,
      this.qualificationPairingMode, this.qualificationPairingMode === 'manual' ? this.previewPairings : undefined)) {
      this.previewOpen = false;
      this.manualPairings = [];
      this.previewPairings = [];
    }
  }

  cancelPreview(): void {
    this.previewOpen = false;
  }

  get previewMatchups(): Array<{ seedA: number; playerA: string; seedB: number; playerB: string }> {
    if (this.qualificationPairingMode === 'manual' && this.previewPairings.length) {
      return this.previewPairings.map((pair, index) => ({
        seedA: index * 2 + 1,
        playerA: pair.playerAId ? this.playerName(pair.playerAId) : 'Bye',
        seedB: index * 2 + 2,
        playerB: pair.playerBId ? this.playerName(pair.playerBId) : 'Bye',
      }));
    }
    const size = 2 ** Math.ceil(Math.log2(Math.max(2, this.previewSeedIds.length)));
    let positions = [1, 2];
    while (positions.length < size) {
      const nextSize = positions.length * 2;
      positions = positions.flatMap((seed) => [seed, nextSize + 1 - seed]);
    }
    const bySeed = new Map(this.previewSeedIds.map((id, index) => [index + 1, id]));
    const rows: Array<{ seedA: number; playerA: string; seedB: number; playerB: string }> = [];
    for (let index = 0; index < positions.length; index += 2) {
      const seedA = positions[index];
      const seedB = positions[index + 1];
      const idA = bySeed.get(seedA);
      const idB = bySeed.get(seedB);
      if (idA || idB) rows.push({ seedA, playerA: idA ? this.playerName(idA) : 'Bye', seedB, playerB: idB ? this.playerName(idB) : 'Bye' });
    }
    return rows;
  }

  setQualificationPairingMode(mode: string): void {
    this.qualificationPairingMode = mode === 'manual' ? 'manual' : 'automatic';
    this.previewOpen = false;
    this.previewPairings = [];
    this.manualPairings = [];
  }

  playerName(playerId: string): string {
    return this.store.tournament().players.find((player) => player.id === playerId)?.displayName ?? 'Jogador';
  }

  record(playerId: string) {
    return calculateTournamentRecords(this.store.tournament()).find((entry) => entry.player.id === playerId);
  }
}
