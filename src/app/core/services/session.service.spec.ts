import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RECARREGAR_APLICACAO, SessionService, UsuarioSessao } from './session.service';

describe('SessionService', () => {
  const usuario: UsuarioSessao = {
    nome: 'Ana Silva',
    email: 'ana@fatec.sp.gov.br',
    curso: 'ADS',
    periodo: '3º período',
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.removeItem('gini_token');
    localStorage.removeItem('gini_usuario');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    sessionStorage.clear();
    ['gini_token', 'gini_usuario', 'gini_preferencias'].forEach((key) =>
      localStorage.removeItem(key),
    );
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

  it('restaura sessão da aba e mantém atualizações no mesmo armazenamento', () => {
    sessionStorage.setItem('gini_token', 'temporario');
    sessionStorage.setItem('gini_usuario', JSON.stringify(usuario));
    const service = TestBed.inject(SessionService);
    expect(service.token).toBe('temporario');
    expect(service.usuario()).toEqual(usuario);
    service.atualizarPerfil('ADS', '1º ano');
    expect(JSON.parse(sessionStorage.getItem('gini_usuario')!).periodo).toBe('1º ano');
    expect(localStorage.getItem('gini_usuario')).toBeNull();
  });

  it('troca entre sessão persistente e sessão da aba sem deixar token antigo', () => {
    const service = TestBed.inject(SessionService);
    service.iniciar('persistente', usuario, true);
    expect(localStorage.getItem('gini_token')).toBe('persistente');
    service.iniciar('aba', usuario, false);
    expect(localStorage.getItem('gini_token')).toBeNull();
    expect(sessionStorage.getItem('gini_token')).toBe('aba');
    service.iniciar('nova', usuario, true);
    expect(sessionStorage.getItem('gini_token')).toBeNull();
    service.limpar();
    expect(service.token).toBeNull();
    expect(service.usuario()).toBeNull();
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
});

describe('SessionService: encerramento sincronizado entre abas (#164)', () => {
  const usuario: UsuarioSessao = {
    nome: 'Ana Silva',
    email: 'ana@fatec.sp.gov.br',
    curso: 'ADS',
    periodo: '1º ano',
  };
  let recarregar: jasmine.Spy<(url: string) => void>;
  /** Faz o papel de outra aba: outra instância do mesmo canal recebe e envia mensagens. */
  let outraAba: BroadcastChannel;
  const esperarMensagens = () => new Promise<void>((resolve) => setTimeout(resolve, 50));
  const chaves = [
    'gini_token',
    'gini_usuario',
    'gini_sessao',
    'gini_preferencias',
    'gini_contas_locais',
  ];

  beforeEach(() => {
    sessionStorage.clear();
    chaves.forEach((chave) => localStorage.removeItem(chave));
    recarregar = jasmine.createSpy('recarregar');
    outraAba = new BroadcastChannel('gini-sessao');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RECARREGAR_APLICACAO, useValue: recarregar }],
    });
  });

  afterEach(() => {
    outraAba.close();
    sessionStorage.clear();
    chaves.forEach((chave) => localStorage.removeItem(chave));
  });

  /** Restaura uma sessão já gravada, como acontece ao abrir ou duplicar uma aba. */
  function abrirAba(storage: Storage, sessao: string, token = 'token-ana'): SessionService {
    storage.setItem('gini_token', token);
    storage.setItem('gini_usuario', JSON.stringify(usuario));
    storage.setItem('gini_sessao', sessao);
    return TestBed.inject(SessionService);
  }

  it('logout avisa as outras abas com o id da sessão, sem enviar o token', async () => {
    const recebidas: unknown[] = [];
    outraAba.onmessage = (evento) => recebidas.push(evento.data);
    const service = TestBed.inject(SessionService);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    service.iniciar('token-ana', usuario, false);
    const id = sessionStorage.getItem('gini_sessao');
    service.logout();
    await esperarMensagens();
    expect(id).toBeTruthy();
    expect(recebidas).toEqual([{ tipo: 'sessao-encerrada', sessao: id }]);
    expect(JSON.stringify(recebidas)).not.toContain('token-ana');
  });

  it('aba da mesma sessão da aba (SessionStorage) encerra, limpa a memória e recarrega no login', async () => {
    const service = abrirAba(sessionStorage, 'sessao-1');
    localStorage.setItem('gini_preferencias', '{"modoEscuro":true}');
    localStorage.setItem('gini_contas_locais', '[{"id":"ana"}]');
    outraAba.postMessage({ tipo: 'sessao-encerrada', sessao: 'sessao-1' });
    await esperarMensagens();
    expect(service.usuario()).toBeNull();
    expect(sessionStorage.getItem('gini_token')).toBeNull();
    expect(recarregar).toHaveBeenCalledOnceWith('/login?motivo=sessao-encerrada');
    // Contas e preferências locais não pertencem à sessão.
    expect(localStorage.getItem('gini_preferencias')).not.toBeNull();
    expect(localStorage.getItem('gini_contas_locais')).not.toBeNull();
  });

  it('ignora o logout de outra sessão independente', async () => {
    const service = abrirAba(sessionStorage, 'sessao-da-bia');
    outraAba.postMessage({ tipo: 'sessao-encerrada', sessao: 'sessao-da-ana' });
    outraAba.postMessage({ tipo: 'outra-coisa', sessao: 'sessao-da-bia' });
    await esperarMensagens();
    expect(service.usuario()).not.toBeNull();
    expect(sessionStorage.getItem('gini_token')).toBe('token-ana');
    expect(recarregar).not.toHaveBeenCalled();
  });

  it('sessão persistida encerra quando outra aba remove o token do LocalStorage', () => {
    const service = abrirAba(localStorage, 'sessao-1');
    localStorage.removeItem('gini_token');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'gini_token', storageArea: localStorage, newValue: null }),
    );
    expect(service.usuario()).toBeNull();
    expect(recarregar).toHaveBeenCalledOnceWith('/login?motivo=sessao-encerrada');
  });

  it('sessão persistida trocada por outra conta: encerra sem apagar a conta nova', () => {
    abrirAba(localStorage, 'sessao-1');
    localStorage.setItem('gini_token', 'token-bia');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'gini_token',
        storageArea: localStorage,
        newValue: 'token-bia',
      }),
    );
    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('gini_token')).toBe('token-bia');
  });

  it('mudanças no LocalStorage não afetam uma sessão só desta aba', () => {
    const service = abrirAba(sessionStorage, 'sessao-1');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'gini_token', storageArea: localStorage, newValue: null }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }));
    expect(service.usuario()).not.toBeNull();
    expect(recarregar).not.toHaveBeenCalled();
  });

  it('sessão aberta antes da #164 ganha um id ao ser restaurada', () => {
    sessionStorage.setItem('gini_token', 'token-ana');
    sessionStorage.setItem('gini_usuario', JSON.stringify(usuario));
    TestBed.inject(SessionService);
    expect(sessionStorage.getItem('gini_sessao')).toBeTruthy();
  });
});
