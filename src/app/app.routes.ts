import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard/dashboard';
import { GradeSemanal } from './features/grade-semanal/grade-semanal';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rotas de configuração de perfil
  {
    path: 'setup',
    loadComponent: () => import('./features/profile-setup/profile-setup')
      .then(m => m.ProfileSetup),
    children: [
      { path: '', redirectTo: 'course-selection', pathMatch: 'full' },
      {
        path: 'course-selection',
        loadComponent: () => import('./features/profile-setup/pages/course-selection/course-selection')
          .then(m => m.CourseSelection)
      },
      {
        path: 'period-selection',
        loadComponent: () => import('./features/profile-setup/pages/period-selection/period-selection')
          .then(m => m.PeriodSelection)
      }
    ]
  },

  // Rotas principais do sistema (possuem o Layout padrão)
  {
    path: '',
    component: Layout,
    // TODO: aplicar authGuard aqui quando a integração com o BackEnd de
    // autenticação estiver pronta (src/app/core/guards)
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'grade-semanal', component: GradeSemanal },
    ],
  },

  // Rota de fallback
  { path: '**', redirectTo: 'login' },
];