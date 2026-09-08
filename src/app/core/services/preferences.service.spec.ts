import { TestBed } from '@angular/core/testing';
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  beforeEach(() => localStorage.removeItem('gini_preferencias'));
  afterEach(() => {
    localStorage.removeItem('gini_preferencias');
    document.documentElement.removeAttribute('data-theme');
  });

  it('restaura as preferências e aplica o tema antes de abrir configurações', () => {
    localStorage.setItem('gini_preferencias', JSON.stringify({ modoEscuro: true, notificacoes: false }));
    const service = TestBed.inject(PreferencesService);
    expect(service.modoEscuro()).toBeTrue();
    expect(service.notificacoes()).toBeFalse();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('persiste os dois controles sem perder a outra preferência', () => {
    const service = TestBed.inject(PreferencesService);
    service.definirModoEscuro(true);
    service.definirNotificacoes(false);
    expect(JSON.parse(localStorage.getItem('gini_preferencias')!)).toEqual({ modoEscuro: true, notificacoes: false });
    service.definirModoEscuro(false);
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(service.notificacoes()).toBeFalse();
  });

  it('usa padrões quando as preferências salvas são inválidas', () => {
    localStorage.setItem('gini_preferencias', 'invalid-json');
    const service = TestBed.inject(PreferencesService);
    expect(service.modoEscuro()).toBeFalse();
    expect(service.notificacoes()).toBeTrue();
  });

  it('avisa quando o navegador não permite persistir preferências', () => {
    const service = TestBed.inject(PreferencesService);
    spyOn(Storage.prototype, 'setItem').and.throwError('Storage unavailable');
    service.definirModoEscuro(true);
    expect(service.modoEscuro()).toBeTrue();
    expect(service.erroPersistencia()).toContain('Não foi possível salvar');
  });
});
