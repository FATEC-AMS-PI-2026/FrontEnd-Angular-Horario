import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Configuracoes } from './configuracoes';
import { PreferencesService } from '../../core/services/preferences.service';
import { SessionService } from '../../core/services/session.service';
import { SettingsSearchService } from '../../core/services/settings-search.service';

describe('Configurações', () => {
  let fixture: ComponentFixture<Configuracoes>;
  let element: HTMLElement;

  beforeEach(async () => {
    ['gini_token', 'gini_usuario', 'gini_preferencias'].forEach(key => localStorage.removeItem(key));
    await TestBed.configureTestingModule({ imports: [Configuracoes], providers: [provideRouter([])] }).compileComponents();
    TestBed.inject(SessionService).iniciar('test-token', {
      nome: 'Ana Silva', email: 'ana@fatec.sp.gov.br', curso: 'ADS', periodo: '3º período',
    });
    fixture = TestBed.createComponent(Configuracoes);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    ['gini_token', 'gini_usuario', 'gini_preferencias'].forEach(key => localStorage.removeItem(key));
    document.documentElement.removeAttribute('data-theme');
  });

  it('mostra os três cards e o perfil dinâmico com e-mail clicável', () => {
    expect(element.querySelectorAll('section.card').length).toBe(3);
    expect(element.querySelector('.conta__nome')?.textContent).toBe('Ana Silva');
    expect(element.querySelector('.conta__email')?.getAttribute('href')).toBe('mailto:ana@fatec.sp.gov.br');
    expect(element.querySelector('.conta__curso')?.textContent).toContain('ADS · 3º período');
  });

  it('alterna notificações e tema pelos controles da tela', () => {
    element.querySelector<HTMLInputElement>('#modo-escuro')!.click();
    element.querySelector<HTMLInputElement>('#notificacoes')!.click();
    expect(TestBed.inject(PreferencesService).modoEscuro()).toBeTrue();
    expect(TestBed.inject(PreferencesService).notificacoes()).toBeFalse();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('filtra cards sem diferenciar acentos e mostra estado vazio', () => {
    const busca = TestBed.inject(SettingsSearchService);
    busca.termo.set('seguranca');
    fixture.detectChanges();
    expect(element.querySelectorAll('section.card').length).toBe(1);
    expect(element.querySelector('#titulo-sobre')).not.toBeNull();
    busca.termo.set('inexistente');
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Nenhuma configuração');
  });

  it('usa o mesmo logout centralizado da sidebar', () => {
    const logout = spyOn(TestBed.inject(SessionService), 'logout');
    element.querySelector<HTMLButtonElement>('.configuracoes__opcao--sair')!.click();
    expect(logout).toHaveBeenCalled();
  });

  it('navega para o fluxo existente de recuperação de senha', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    element.querySelector<HTMLAnchorElement>('a[routerLink="/esqueci-senha"]')!.click();
    expect(navigate).toHaveBeenCalled();
  });

  it('explica documentos ainda não publicados em um diálogo fechável', () => {
    const button = Array.from(element.querySelectorAll('button')).find(item => item.textContent?.includes('Privacidade'))!;
    button.click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')?.open).toBeTrue();
    expect(element.querySelector('#titulo-documento')?.textContent).toBe('Privacidade e Segurança');
    expect(element.querySelector('#aviso-documento')?.textContent).toContain('ainda não foi disponibilizado');
    element.querySelector<HTMLButtonElement>('dialog button')!.click();
    expect(element.querySelector('dialog')?.open).toBeFalse();
  });
});
