import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SessionService, UsuarioSessao } from './session.service';

describe('SessionService', () => {
  const usuario: UsuarioSessao = { nome: 'Ana Silva', email: 'ana@fatec.sp.gov.br', curso: 'ADS', periodo: '3º período' };

  beforeEach(() => {
    localStorage.removeItem('gini_token');
    localStorage.removeItem('gini_usuario');
    sessionStorage.removeItem('gini_token');
    sessionStorage.removeItem('gini_usuario');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    ['gini_token', 'gini_usuario', 'gini_preferencias'].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  });

  it('restaura a conta autenticada e a identificação acadêmica', () => {
    localStorage.setItem('gini_token', 'test-token');
    localStorage.setItem('gini_usuario', JSON.stringify(usuario));
    const service = TestBed.inject(SessionService);
    expect(service.usuario()).toEqual(usuario);
    expect(service.iniciais()).toBe('AS');
    expect(service.identificacao()).toBe('ADS · 3º período');
  });

  it('não mostra perfil antigo quando não há token', () => {
    localStorage.setItem('gini_usuario', JSON.stringify(usuario));
    expect(TestBed.inject(SessionService).usuario()).toBeNull();
  });

  it('atualiza e persiste curso e período do onboarding', () => {
    const service = TestBed.inject(SessionService);
    service.iniciar('test-token', usuario);
    service.atualizarPerfil('Secretariado', '2º período');
    expect(service.identificacao()).toBe('Secretariado · 2º período');
    expect(JSON.parse(localStorage.getItem('gini_usuario')!).periodo).toBe('2º período');
  });

  it('encerra a sessão, redireciona e preserva preferências', () => {
    const service = TestBed.inject(SessionService);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    service.iniciar('test-token', usuario);
    localStorage.setItem('gini_preferencias', '{"modoEscuro":true}');
    service.logout();
    expect(localStorage.getItem('gini_token')).toBeNull();
    expect(localStorage.getItem('gini_usuario')).toBeNull();
    expect(service.usuario()).toBeNull();
    expect(localStorage.getItem('gini_preferencias')).not.toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  // Critérios "Persistência de Sessão" / "Sessão Volátil (Padrão)" da issue #130.
  it('guarda no LocalStorage quando lembrarDeMim é true (padrão)', () => {
    const service = TestBed.inject(SessionService);
    service.iniciar('test-token', usuario, true);
    expect(localStorage.getItem('gini_token')).toBe('test-token');
    expect(sessionStorage.getItem('gini_token')).toBeNull();
  });

  it('guarda no SessionStorage quando lembrarDeMim é false', () => {
    const service = TestBed.inject(SessionService);
    service.iniciar('test-token', usuario, false);
    expect(sessionStorage.getItem('gini_token')).toBe('test-token');
    expect(localStorage.getItem('gini_token')).toBeNull();
  });

  it('restaura a sessão a partir do SessionStorage ao recarregar', () => {
    sessionStorage.setItem('gini_token', 'test-token');
    sessionStorage.setItem('gini_usuario', JSON.stringify(usuario));
    expect(TestBed.inject(SessionService).usuario()).toEqual(usuario);
  });

  it('logout limpa tanto LocalStorage quanto SessionStorage', () => {
    const service = TestBed.inject(SessionService);
    service.iniciar('test-token', usuario, false);
    service.logout();
    expect(sessionStorage.getItem('gini_token')).toBeNull();
    expect(localStorage.getItem('gini_token')).toBeNull();
  });
});
