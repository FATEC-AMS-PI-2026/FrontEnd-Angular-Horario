import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { profileGuard } from './profile.guard';
import { ProfileSetupService } from '../../features/profile-setup/services/profile-setup.service';
import { environment } from '../../../environments/environment';

@Component({ template: '' })
class PaginaTeste { }

describe('profileGuard: proteção das jornadas', () => {
    let harness: RouterTestingHarness;
    let http: HttpTestingController;
    let setup: ProfileSetupService;
    const perfil = {
        usuario: { nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: 'ADS', periodo: '1º período' },
        cursoId: 'ads', disciplinasIds: ['bd'], configuracaoInicialConcluida: true,
        periodoLetivoAtual: '2026', periodoLetivoConfirmado: '2025',
    };
    beforeEach(async () => {
        localStorage.removeItem('gini_token');
        localStorage.removeItem('gini_usuario');
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([
                { path: 'login', component: PaginaTeste },
                {
                    path: '', canActivateChild: [profileGuard], children: [
                        { path: 'setup/course-selection', component: PaginaTeste },
                        { path: 'setup/period-selection', component: PaginaTeste },
                        { path: 'setup/discipline-selection', component: PaginaTeste },
                        { path: 'dashboard', component: PaginaTeste },
                    ]
                },
            ])]
        });
        http = TestBed.inject(HttpTestingController);
        setup = TestBed.inject(ProfileSetupService);
        harness = await RouterTestingHarness.create();
    });
    afterEach(() => {
        http.verify();
        localStorage.removeItem('gini_token');
        localStorage.removeItem('gini_usuario');
    });

    function carregar(concluido: boolean, confirmado = '2025'): void {
        localStorage.setItem('gini_token', 'token');
        setup.carregarPerfil().subscribe();
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil').flush({
            ...perfil, configuracaoInicialConcluida: concluido, periodoLetivoConfirmado: confirmado,
            cursoId: concluido ? 'ads' : null,
            usuario: { ...perfil.usuario, periodo: concluido ? '1º período' : '' },
        });
    }

    it('bloqueia acesso direto sem autenticação', async () => {
        await harness.navigateByUrl('/dashboard');
        expect(TestBed.inject(Router).url).toBe('/login');
        await harness.navigateByUrl('/setup/discipline-selection');
        expect(TestBed.inject(Router).url).toBe('/login');
    });

    it('impede pular curso e disciplinas no primeiro acesso', async () => {
        carregar(false);
        await harness.navigateByUrl('/dashboard');
        expect(TestBed.inject(Router).url).toBe('/setup/course-selection');
        await harness.navigateByUrl('/setup/discipline-selection');
        expect(TestBed.inject(Router).url).toBe('/setup/course-selection');
        setup.setCourse('ADS', 'ads');
        await harness.navigateByUrl('/setup/discipline-selection');
        expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
    });

    it('a partir do segundo acesso no mesmo período letivo vai direto ao início (#148)', async () => {
        carregar(true, '2026');
        expect(setup.destinoAposLogin()).toBe('/dashboard');
        await harness.navigateByUrl('/dashboard');
        expect(TestBed.inject(Router).url).toBe('/dashboard');
        // Acesso voluntário pela Configurações (#147) continua liberado.
        await harness.navigateByUrl('/setup/period-selection');
        expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
        await harness.navigateByUrl('/setup/discipline-selection');
        expect(TestBed.inject(Router).url).toBe('/setup/discipline-selection');
    });

    it('pula curso no retorno e exige confirmação quando começa um novo período letivo', async () => {
        carregar(true);
        await harness.navigateByUrl('/setup/course-selection');
        expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
        await harness.navigateByUrl('/dashboard');
        expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
        setup.confirmarPeriodo().subscribe();
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil/periodo').flush({ ...perfil, periodoLetivoConfirmado: '2026' });
        await harness.navigateByUrl('/dashboard');
        expect(TestBed.inject(Router).url).toBe('/dashboard');
    });

    it('restaura o perfil via API após recarregar e limpa uma sessão recusada', async () => {
        localStorage.setItem('gini_token', 'expirado');
        const navigation = harness.navigateByUrl('/setup/period-selection');
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil').flush({}, { status: 401, statusText: 'Unauthorized' });
        await navigation;
        expect(TestBed.inject(Router).url).toBe('/login?motivo=sessao-expirada');
        expect(localStorage.getItem('gini_token')).toBeNull();
    });
});
