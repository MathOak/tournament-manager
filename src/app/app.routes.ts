import { Routes } from '@angular/router';
import { AdminComponent } from './features/admin/admin.component';
import { BracketDisplayComponent } from './features/brackets/bracket-display.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PlayersComponent } from './features/players/players.component';
import { TournamentComponent } from './features/tournament/tournament.component';

export const routes: Routes = [
	{ path: '', component: DashboardComponent, title: 'Dashboard | Tournament Manager' },
	{ path: 'display', redirectTo: 'display/dashboard', pathMatch: 'full' },
	{ path: 'display/dashboard', component: DashboardComponent, data: { displayMode: true }, title: 'Modo telão | Tournament Manager' },
	{ path: 'display/brackets', component: BracketDisplayComponent, data: { displayMode: true }, title: 'Chaves no telão | Tournament Manager' },
	{ path: 'brackets', component: BracketDisplayComponent, title: 'Chaves | Tournament Manager' },
	{ path: 'players', component: PlayersComponent, title: 'Jogadores | Tournament Manager' },
	{ path: 'tournament', component: TournamentComponent, title: 'Torneio | Tournament Manager' },
	{ path: 'admin', component: AdminComponent, title: 'Admin | Tournament Manager' },
	{ path: '**', redirectTo: '' },
];
