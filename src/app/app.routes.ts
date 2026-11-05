import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { APP_CONFIG } from './core/app-config';
import { AdminComponent } from './features/admin/admin.component';
import { BracketDisplayComponent } from './features/brackets/bracket-display.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PlayersComponent } from './features/players/players.component';
import { TournamentComponent } from './features/tournament/tournament.component';

const pageTitle = (pageName: string): ResolveFn<string> =>
	() => `${pageName} | ${inject(APP_CONFIG).eventName}`;

export const routes: Routes = [
	{ path: '', component: DashboardComponent, title: pageTitle('Dashboard') },
	{ path: 'display', redirectTo: 'display/dashboard', pathMatch: 'full' },
	{ path: 'display/dashboard', component: DashboardComponent, data: { displayMode: true }, title: pageTitle('Modo telão') },
	{ path: 'display/brackets', component: BracketDisplayComponent, data: { displayMode: true }, title: pageTitle('Chaves no telão') },
	{ path: 'brackets', component: BracketDisplayComponent, title: pageTitle('Chaves') },
	{ path: 'players', component: PlayersComponent, title: pageTitle('Jogadores') },
	{ path: 'tournament', component: TournamentComponent, title: pageTitle('Torneio') },
	{ path: 'admin', component: AdminComponent, title: pageTitle('Admin') },
	{ path: '**', redirectTo: '' },
];
