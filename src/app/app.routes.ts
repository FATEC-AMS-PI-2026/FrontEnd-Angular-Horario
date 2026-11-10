import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './features/auth/pages/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { GradeSemanal } from './features/grade-semanal/grade-semanal';
import { profileGuard } from './core/guards/profile.guard';
import { guestGuard } from './core/guards/guest.guard';
import { ROTAS_EXEMPLO_TURMAS } from './features/horarios/exemplo-turmas.routes';
export const routes: Routes = [
    { path: 'login', component: Login, canActivate: [guestGuard] },

    {
        path: 'cadastro',
        canActivate: [guestGuard],
        loadComponent: () =>
            import('./features/auth/pages/cadastro/cadastro').then((m) => m.Cadastro),
    },

    // Recuperação de senha é só para visitantes; logado, a troca usa /alterar-senha (#158).
    {
        path: 'esqueci-senha',
        canActivate: [guestGuard],
        loadComponent: () =>
            import('./features/auth/pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    },

    {
        path: 'alterar-senha',
        canActivateChild: [profileGuard],
        children: [{
            path: '',
            data: { alteracaoAutenticada: true },
            loadComponent: () =>
                import('./features/auth/pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
        }],
    },

    { path: '', redirectTo: 'login', pathMatch: 'full' },

    // Rotas de configuração de perfil
    {
        path: 'setup',
        canActivateChild: [profileGuard],
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
            },
            {
                path: 'discipline-selection',
                loadComponent: () => import('./features/profile-setup/pages/discipline-selection/discipline-selection')
                    .then(m => m.DisciplineSelection)
            }
        ]
    },

    // Rotas principais do sistema (possuem o Layout padrão)
    {
        path: '',
        component: Layout,
        canActivateChild: [profileGuard],
        children: [
            { path: 'dashboard', component: Dashboard },
            {
                path: 'configuracoes',
                loadComponent: () =>
                    import('./features/configuracoes/configuracoes').then((m) => m.Configuracoes),
            },
            {
                path: 'horarios',
                loadComponent: () =>
                    import('./features/horarios/horarios').then((m) => m.Horarios),
            },
            { path: 'grade-semanal', component: GradeSemanal },
            ...ROTAS_EXEMPLO_TURMAS,
            {
                path: 'salas',
                loadComponent: () =>
                    import('./features/salas/pages/lista-salas/lista-salas').then((m) => m.ListaSalas),
            },
            {
                path: 'salas/:id',
                loadComponent: () =>
                    import('./features/salas/pages/detalhes-sala/detalhes-sala').then((m) => m.DetalhesSala),
            },
            {
                path: 'professores',
                loadComponent: () =>
                    import('./features/professores/professores').then((m) => m.Professores),
            },
        ],
    },

    // Rota de fallback: página 404 com retorno conforme a sessão (#158)
    {
        path: '**',
        loadComponent: () =>
            import('./features/nao-encontrada/nao-encontrada').then((m) => m.NaoEncontrada),
    },
];
