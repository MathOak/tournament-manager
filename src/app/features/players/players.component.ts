import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TournamentStore } from '../../core/tournament-store.service';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './players.component.html',
})
export class PlayersComponent {
  readonly store = inject(TournamentStore);
  name = '';
  handle = '';
  importError = '';

  addPlayer(): void {
    if (this.store.addPlayer(this.name, this.handle)) {
      this.name = '';
      this.handle = '';
    }
  }

  removePlayer(playerId: string): void {
    if (confirm('Remover este jogador?')) this.store.removePlayer(playerId);
  }

  exportTournament(): void {
    const file = new Blob([this.store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'torneio.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async importTournament(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const accepted = confirm('Importar este arquivo substituirá os dados atuais do torneio. Continuar?');
    if (!accepted) {
      input.value = '';
      return;
    }
    const success = this.store.importJson(await file.text());
    this.importError = success ? '' : this.store.notice();
    input.value = '';
  }
}
