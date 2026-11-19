import { TestBed } from '@angular/core/testing';
import { PreferencesService } from './preferences.service';

/** `matchMedia` falso e controlável: simula o tema do sistema operacional. */
function simularSistema(escuro: boolean) {
  const ouvintes: ((e: MediaQueryListEvent) => void)[] = [];
  const consulta = {
    matches: escuro,
    addEventListener: (_: string, ouvinte: (e: MediaQueryListEvent) => void) =>
      ouvintes.push(ouvinte),
    removeEventListener: () => undefined,
  };
  spyOn(window, 'matchMedia').and.returnValue(consulta as unknown as MediaQueryList);
  return {
    mudar(novo: boolean) {
      consulta.matches = novo;
      ouvintes.forEach((ouvinte) => ouvinte({ matches: novo } as MediaQueryListEvent));
    },
  };
}

describe('PreferencesService', () => {
  beforeEach(() => localStorage.removeItem('gini_preferencias'));
  afterEach(() => {
    localStorage.removeItem('gini_preferencias');
    document.documentElement.removeAttribute('data-theme');
  });

  it('restaura as preferências e aplica o tema antes de abrir configurações', () => {
    simularSistema(false);
    localStorage.setItem(
      'gini_preferencias',
      JSON.stringify({ modoEscuro: true, notificacoes: false }),
    );
    const service = TestBed.inject(PreferencesService);
    expect(service.modoEscuro()).toBeTrue();
    expect(service.notificacoes()).toBeFalse();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('persiste os dois controles sem perder a outra preferência', () => {
    simularSistema(false);
    const service = TestBed.inject(PreferencesService);
    service.definirModoEscuro(true);
    service.definirNotificacoes(false);
    expect(JSON.parse(localStorage.getItem('gini_preferencias')!)).toEqual({
      modoEscuro: true,
      temaManual: true,
      notificacoes: false,
    });
    service.definirModoEscuro(false);
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(service.notificacoes()).toBeFalse();
  });

  it('usa padrões quando as preferências salvas são inválidas', () => {
    simularSistema(false);
    localStorage.setItem('gini_preferencias', 'invalid-json');
    const service = TestBed.inject(PreferencesService);
    expect(service.modoEscuro()).toBeFalse();
    expect(service.notificacoes()).toBeTrue();
  });

  it('avisa quando o navegador não permite persistir preferências', () => {
    simularSistema(false);
    const service = TestBed.inject(PreferencesService);
    spyOn(Storage.prototype, 'setItem').and.throwError('Storage unavailable');
    service.definirModoEscuro(true);
    expect(service.modoEscuro()).toBeTrue();
    expect(service.erroPersistencia()).toContain('Não foi possível salvar');
  });

  describe('tema do sistema (#163)', () => {
    it('primeiro acesso usa o tema do sistema', () => {
      simularSistema(true);
      const service = TestBed.inject(PreferencesService);
      expect(service.modoEscuro()).toBeTrue();
      expect(document.documentElement.dataset['theme']).toBe('dark');
    });

    it('acompanha a mudança do sistema enquanto não há escolha manual', () => {
      const sistema = simularSistema(false);
      const service = TestBed.inject(PreferencesService);
      sistema.mudar(true);
      expect(service.modoEscuro()).toBeTrue();
      expect(document.documentElement.dataset['theme']).toBe('dark');
      sistema.mudar(false);
      expect(document.documentElement.dataset['theme']).toBe('light');
    });

    it('a escolha manual é salva e prevalece quando o sistema muda', () => {
      const sistema = simularSistema(true);
      const service = TestBed.inject(PreferencesService);
      service.definirModoEscuro(false);
      sistema.mudar(true);
      expect(service.modoEscuro()).toBeFalse();
      expect(document.documentElement.dataset['theme']).toBe('light');
      expect(JSON.parse(localStorage.getItem('gini_preferencias')!).temaManual).toBeTrue();
    });

    it('a escolha manual de tema claro vale no próximo acesso mesmo com o sistema escuro', () => {
      simularSistema(true);
      localStorage.setItem(
        'gini_preferencias',
        JSON.stringify({ modoEscuro: false, temaManual: true, notificacoes: true }),
      );
      expect(TestBed.inject(PreferencesService).modoEscuro()).toBeFalse();
    });

    it('mexer nas notificações não fixa o tema', () => {
      const sistema = simularSistema(false);
      const service = TestBed.inject(PreferencesService);
      service.definirNotificacoes(false);
      expect(JSON.parse(localStorage.getItem('gini_preferencias')!)).toEqual({
        notificacoes: false,
      });
      sistema.mudar(true);
      expect(service.modoEscuro()).toBeTrue();
    });

    it('preferência salva antes da #163 com modoEscuro false continua seguindo o sistema', () => {
      simularSistema(true);
      localStorage.setItem(
        'gini_preferencias',
        JSON.stringify({ modoEscuro: false, notificacoes: false }),
      );
      const service = TestBed.inject(PreferencesService);
      expect(service.modoEscuro()).toBeTrue();
      expect(service.notificacoes()).toBeFalse();
    });
  });
});
