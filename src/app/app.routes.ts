import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/layout/layout').then(m => m.Layout),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/home/home').then(m => m.Home),
      },
      {
        path: 'accounts',
        loadComponent: () => import('./features/dashboard/accounts/accounts').then(m => m.Accounts),
      },
      {
        path: 'envelopes',
        loadComponent: () => import('./features/dashboard/envelopes/envelopes').then(m => m.Envelopes),
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/dashboard/transactions/transactions').then(m => m.Transactions),
      },
    ],
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
