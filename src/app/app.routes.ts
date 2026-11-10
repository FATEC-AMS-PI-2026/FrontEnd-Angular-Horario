import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Login } from './features/auth/pages/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { GradeSemanal } from './features/grade-semanal/grade-semanal';
import { profileGuard } from './core/guards/profile.guard';
import { guestGuard } from './core/guards/guest.guard';
import { ROTAS_EXEMPLO_TURMAS } from './features/horarios/exemplo-turmas.routes';
export const routes: Routes = [
    { path: 'login', title: 'Entrar', component: Login, canActivate: [guestGuard] },

    {
        path: 'cadastro',
        title: 'Criar conta',
        canActivate: [guestGuard],
        loadComponent: () =>
            import('./features/auth/pages/cadastro/cadastro').then((m) => m.Cadastro),
    },

    // Recuperação de senha é só para visitantes; logado, a troca usa /alterar-senha (#158).
    {
        path: 'esqueci-senha',
        title: 'Esqueci minha senha',
        canActivate: [guestGuard],
        loadComponent: () =>
            import('./features/auth/pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    },

    {
        path: 'alterar-senha',
        canActivateChild: [profileGuard],
        children: [{
            path: '',
            title: 'Alterar senha',
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
                title: 'Escolha seu curso',
                loadComponent: () => import('./features/profile-setup/pages/course-selection/course-selection')
                    .then(m => m.CourseSelection)
            },
            {
                path: 'period-selection',
                title: 'Escolha seu período',
                loadComponent: () => import('./features/profile-setup/pages/period-selection/period-selection')
                    .then(m => m.PeriodSelection)
            },
            {
                path: 'discipline-selection',
                title: 'Escolha suas disciplinas',
                loadComponent: () => import('./features/profile-setup/pages/discipline-selection/discipline-selection')
                    .then(m => m.DisciplineSelection)
            }
        ]
    },

    // Rotas principais do sistema (possuem o Layout padrão).
    // O `title` de cada rota vai para a aba e para o Topbar (TituloPaginaService, #161).
    {
        path: '',
        component: Layout,
        canActivateChild: [profileGuard],
        children: [
            { path: 'dashboard', title: 'Início', component: Dashboard },
            {
                path: 'configuracoes',
                title: 'Configurações',
                loadComponent: () =>
                    import('./features/configuracoes/configuracoes').then((m) => m.Configuracoes),
            },
            {
                path: 'horarios',
                title: 'Horários',
                loadComponent: () =>
                    import('./features/horarios/horarios').then((m) => m.Horarios),
            },
            { path: 'grade-semanal', title: 'Grade Semanal', component: GradeSemanal },
            ...ROTAS_EXEMPLO_TURMAS,
            {
                path: 'salas',
                title: 'Salas',
                loadComponent: () =>
                    import('./features/salas/pages/lista-salas/lista-salas').then((m) => m.ListaSalas),
            },
            {
                path: 'salas/:id',
                title: 'Salas',
                loadComponent: () =>
                    import('./features/salas/pages/detalhes-sala/detalhes-sala').then((m) => m.DetalhesSala),
            },
            {
                path: 'professores',
                title: 'Professores',
                loadComponent: () =>
                    import('./features/professores/professores').then((m) => m.Professores),
            },
        ],
    },

    // Rota de fallback: página 404 com retorno conforme a sessão (#158)
    {
        path: '**',
        title: 'Página não encontrada',
        loadComponent: () =>
            import('./features/nao-encontrada/nao-encontrada').then((m) => m.NaoEncontrada),
    },
];
