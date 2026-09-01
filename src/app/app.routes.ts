import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard/dashboard';
import { GradeSemanal } from './features/grade-semanal/grade-semanal';
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
      { path: 'grade-semanal', component: GradeSemanal },
      {
        path: 'salas',
        loadComponent: () =>
          import('./features/salas/lista-salas/lista-salas').then((m) => m.ListaSalas),
      },
      {
        path: 'salas/:id',
        loadComponent: () =>
          import('./features/salas/detalhes-sala/detalhes-sala').then((m) => m.DetalhesSala),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
