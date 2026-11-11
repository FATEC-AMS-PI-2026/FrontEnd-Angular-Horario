import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { guestGuard } from './guest.guard';
import { environment } from '../../../environments/environment';

@Component({ template: '' })
class PaginaTeste { }

describe('guestGuard: rotas só de visitante (#158)', () => {
    let harness: RouterTestingHarness;
    let http: HttpTestingController;
    const perfilUrl = environment.apiUrl + '/usuarios/me/perfil';
    const usuario = { nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: 'ADS', periodo: '1º período' };
    const perfil = {
        usuario, cursoId: 'ads', disciplinasIds: ['bd'], configuracaoInicialConcluida: true,
        periodoLetivoAtual: '2026', periodoLetivoConfirmado: '2026',
    };

    function limparSessao(): void {
        for (const storage of [localStorage, sessionStorage]) {
            storage.removeItem('gini_token');
            storage.removeItem('gini_usuario');
        }
    }

    beforeEach(async () => {
        limparSessao();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([
                { path: 'login', component: PaginaTeste, canActivate: [guestGuard] },
                { path: 'cadastro', component: PaginaTeste, canActivate: [guestGuard] },
                { path: 'esqueci-senha', component: PaginaTeste, canActivate: [guestGuard] },
                { path: 'setup/course-selection', component: PaginaTeste },
                { path: 'setup/period-selection', component: PaginaTeste },
                { path: 'dashboard', component: PaginaTeste },
            ])],
        });
        http = TestBed.inject(HttpTestingController);
        harness = await RouterTestingHarness.create();
    });

    afterEach(() => {
        http.verify();
        limparSessao();
    });

    function logado(storage: Storage = localStorage): void {
        storage.setItem('gini_token', 'token');
        storage.setItem('gini_usuario', JSON.stringify(usuario));
    }

    /** Navega com sessão ativa, respondendo à leitura do perfil que o guarda faz. */
    async function navegarLogado(url: string, resposta: object | 'erro'): Promise<string> {
        const navegacao = harness.navigateByUrl(url);
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        const requisicao = http.expectOne(perfilUrl);
        if (resposta === 'erro') requisicao.flush({}, { status: 500, statusText: 'Erro' });
        else requisicao.flush(resposta);
        await navegacao;
        return TestBed.inject(Router).url;
    }

    it('libera login, cadastro e recuperação para visitantes sem consultar o perfil', async () => {
        for (const url of ['/login', '/cadastro', '/esqueci-senha']) {
            await harness.navigateByUrl(url);
            expect(TestBed.inject(Router).url).toBe(url);
        }
    });

    it('leva quem tem perfil concluído ao Início sem limpar a sessão', async () => {
        logado();
        expect(await navegarLogado('/cadastro', perfil)).toBe('/dashboard');
        expect(localStorage.getItem('gini_token')).toBe('token');
        expect(localStorage.getItem('gini_usuario')).toContain('Ana');
        // Perfil já carregado: as próximas tentativas não repetem a requisição.
        await harness.navigateByUrl('/esqueci-senha');
        expect(TestBed.inject(Router).url).toBe('/dashboard');
        await harness.navigateByUrl('/login');
        expect(TestBed.inject(Router).url).toBe('/dashboard');
    });

    it('manda quem ainda não concluiu o perfil para a escolha do curso', async () => {
        logado(sessionStorage);
        const incompleto = {
            ...perfil, configuracaoInicialConcluida: false, cursoId: null,
            usuario: { ...usuario, periodo: '' },
        };
        expect(await navegarLogado('/cadastro', incompleto)).toBe('/setup/course-selection');
        expect(sessionStorage.getItem('gini_token')).toBe('token');
    });

    it('respeita a reentrada: novo período letivo pede a confirmação do período (#148)', async () => {
        logado();
        const novoPeriodo = { ...perfil, periodoLetivoConfirmado: '2025' };
        expect(await navegarLogado('/login', novoPeriodo)).toBe('/setup/period-selection');
    });

    it('sem conseguir ler o perfil, entrega ao Início para o profileGuard decidir', async () => {
        logado();
        expect(await navegarLogado('/cadastro', 'erro')).toBe('/dashboard');
        expect(localStorage.getItem('gini_token')).toBe('token');
    });
});
