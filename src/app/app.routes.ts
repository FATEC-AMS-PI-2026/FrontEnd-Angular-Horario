import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard/dashboard';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Layout,
    // TODO: aplicar authGuard aqui quando a integração com o BackEnd de
    // autenticação estiver pronta (src/app/core/guards)
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
