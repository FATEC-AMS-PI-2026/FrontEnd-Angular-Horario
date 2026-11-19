import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, TitleStrategy, provideRouter } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { Topbar } from './topbar';
import { TopbarContextService } from '../../../core/services/topbar-context.service';
import { TITULO_PADRAO, TituloPaginaService } from '../../../core/services/titulo-pagina.service';

@Component({ template: '' })
class PaginaTeste {}

@Component({ imports: [Topbar], template: '<app-topbar />' })
class ComTopbar {}

describe('Topbar: título da rota ativa (#161)', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: ComTopbar,
            children: [
              { path: 'dashboard', title: 'Início', component: PaginaTeste },
              { path: 'configuracoes', title: 'Configurações', component: PaginaTeste },
              { path: 'salas', title: 'Salas', component: PaginaTeste },
              { path: 'salas/:id', title: 'Salas', component: PaginaTeste },
              { path: 'sem-titulo', component: PaginaTeste },
            ],
          },
          {
            path: 'setup',
            component: ComTopbar,
            children: [
              { path: 'period-selection', title: 'Escolha seu período', component: PaginaTeste },
            ],
          },
        ]),
        { provide: TitleStrategy, useExisting: TituloPaginaService },
        // Histórico simulado: voltar/avançar disparam o popstate que o Router escuta.
        provideLocationMocks(),
      ],
    });
    harness = await RouterTestingHarness.create();
    // Como no bootstrap do app: o Router passa a ouvir o voltar/avançar do histórico.
    TestBed.inject(Router).initialNavigation();
  });

  async function abrir(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    harness.detectChanges();
  }

  const h1 = () => harness.fixture.nativeElement.querySelector('h1')?.textContent?.trim();
  const aba = () => TestBed.inject(Title).getTitle();

  it('mostra no Topbar e na aba o título definido na rota, inclusive em rotas aninhadas', async () => {
    await abrir('/dashboard');
    expect(h1()).toBe('Início');
    expect(aba()).toBe('Início · GINI');
    await abrir('/setup/period-selection');
    expect(h1()).toBe('Escolha seu período');
    expect(aba()).toBe('Escolha seu período · GINI');
  });

  it('não depende de trechos da URL: query string e rota sem título', async () => {
    await abrir('/salas?tipo=laboratorio');
    expect(h1()).toBe('Salas');
    await abrir('/sem-titulo');
    expect(h1()).toBe('GINI');
    expect(aba()).toBe(TITULO_PADRAO);
  });

  it('atualiza ao usar voltar e avançar do navegador', async () => {
    await abrir('/dashboard');
    await abrir('/configuracoes');
    expect(harness.fixture.nativeElement.querySelector('.topbar__busca')).not.toBeNull();
    const location = TestBed.inject(Location);
    const fimDaNavegacao = () =>
      firstValueFrom(TestBed.inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd)));
    let fim = fimDaNavegacao();
    location.back();
    await fim;
    harness.detectChanges();
    expect(h1()).toBe('Início');
    expect(aba()).toBe('Início · GINI');
    fim = fimDaNavegacao();
    location.forward();
    await fim;
    harness.detectChanges();
    expect(h1()).toBe('Configurações');
  });

  it('preserva o breadcrumb de Salas/código nos detalhes e põe o código na aba', async () => {
    await abrir('/salas/1');
    const contexto = TestBed.inject(TopbarContextService);
    contexto.sala.set('LAB 01');
    harness.detectChanges();
    expect(h1()).toContain('Salas / LAB 01');
    expect(harness.fixture.nativeElement.querySelector('nav a').getAttribute('href')).toBe(
      '/salas',
    );
    expect(aba()).toBe('LAB 01 · Salas · GINI');
    contexto.sala.set(null);
    harness.detectChanges();
    expect(harness.fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(h1()).toBe('Salas');
  });

  it('aceita um título que a página só conhece depois de carregar dados', async () => {
    await abrir('/setup/period-selection');
    const titulos = TestBed.inject(TituloPaginaService);
    titulos.sobrescrever('Escolha seu ano');
    harness.detectChanges();
    expect(h1()).toBe('Escolha seu ano');
    expect(aba()).toBe('Escolha seu ano · GINI');
    titulos.limparSobrescrita();
    harness.detectChanges();
    expect(h1()).toBe('Escolha seu período');
  });
});
