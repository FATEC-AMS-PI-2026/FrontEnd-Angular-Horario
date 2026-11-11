import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NaoEncontrada } from './nao-encontrada';

@Component({ template: '' })
class PaginaTeste { }

describe('NaoEncontrada: página 404 (#158)', () => {
    function limparSessao(): void {
        localStorage.removeItem('gini_token');
        sessionStorage.removeItem('gini_token');
    }

    beforeEach(() => {
        limparSessao();
        TestBed.configureTestingModule({
            providers: [provideRouter([
                { path: 'login', component: PaginaTeste },
                { path: '**', component: NaoEncontrada },
            ])],
        });
    });
    afterEach(limparSessao);

    async function abrir(url: string): Promise<HTMLElement> {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(url);
        harness.detectChanges();
        return harness.routeNativeElement!;
    }

    it('mostra a página em vez de redirecionar silenciosamente ao login', async () => {
        const pagina = await abrir('/rota-que-nao-existe');
        expect(pagina.querySelector('h1')?.textContent).toContain('Página não encontrada');
        expect(pagina.textContent).toContain('/rota-que-nao-existe');
    });

    it('visitante volta para o login', async () => {
        const link = (await abrir('/xyz')).querySelector<HTMLAnchorElement>('a')!;
        expect(link.textContent).toContain('Ir para o login');
        expect(link.getAttribute('href')).toBe('/login');
    });

    it('usuário logado volta para o início', async () => {
        sessionStorage.setItem('gini_token', 'token');
        const link = (await abrir('/xyz')).querySelector<HTMLAnchorElement>('a')!;
        expect(link.textContent).toContain('Voltar ao início');
        expect(link.getAttribute('href')).toBe('/dashboard');
    });
});
