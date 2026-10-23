import { Routes } from '@angular/router';
import { AdminComponent } from './features/admin/admin.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PlayersComponent } from './features/players/players.component';
import { TournamentComponent } from './features/tournament/tournament.component';

export const routes: Routes = [
	{ path: '', component: DashboardComponent, title: 'Dashboard | Tournament Manager' },
	{ path: 'players', component: PlayersComponent, title: 'Jogadores | Tournament Manager' },
	{ path: 'tournament', component: TournamentComponent, title: 'Torneio | Tournament Manager' },
	{ path: 'admin', component: AdminComponent, title: 'Admin | Tournament Manager' },
	{ path: '**', redirectTo: '' },
];
