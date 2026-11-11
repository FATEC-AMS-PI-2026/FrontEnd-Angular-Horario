import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface UsuarioSessao {
  nome: string;
  email: string;
  curso: string;
  periodo: string;
}

const TOKEN_KEY = 'gini_token';
const USUARIO_KEY = 'gini_usuario';
/** Identifica uma sessão: abas com o mesmo id (ex.: aba duplicada) são a mesma sessão (#164). */
const SESSAO_KEY = 'gini_sessao';
const CANAL_SESSAO = 'gini-sessao';
export const MOTIVO_SESSAO_ENCERRADA = 'sessao-encerrada';

/** Mensagem trocada entre abas pelo BroadcastChannel. Leva só o id da sessão, nunca o token. */
interface SessaoEncerrada {
  tipo: 'sessao-encerrada';
  sessao: string;
}

/**
 * Recarrega a aplicação numa URL. Usar recarga completa ao encerrar a sessão por outra aba
 * descarta de uma vez todo o estado pessoal em memória e as respostas ainda pendentes (#164).
 * Substituível nos testes.
 */
export const RECARREGAR_APLICACAO = new InjectionToken<(url: string) => void>(
  'RECARREGAR_APLICACAO',
  {
    providedIn: 'root',
    factory: () => (url: string) => window.location.assign(url),
  },
);

/** Leitura comum para Services e guardas, independentemente de Lembrar de mim. */
export function obterTokenSessao(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly router = inject(Router);
  private readonly recarregar = inject(RECARREGAR_APLICACAO);
  private readonly canal =
    typeof BroadcastChannel === 'function' ? new BroadcastChannel(CANAL_SESSAO) : null;
  /** Sessão que esta aba está mostrando, guardada em memória: o storage pode mudar por outra aba. */
  private sessao: { id: string; token: string; area: 'local' | 'session' } | null = null;
  private readonly usuarioAtual = signal<UsuarioSessao | null>(this.restaurarUsuario());
  readonly usuario = this.usuarioAtual.asReadonly();
  readonly identificacao = computed(() => {
    const usuario = this.usuario();
    return (
      [usuario?.curso, usuario?.periodo].filter(Boolean).join(' · ') || 'Perfil não configurado'
    );
  });
  readonly iniciais = computed(() => {
    const nomes = this.usuario()?.nome.trim().split(/\s+/) ?? [];
    return nomes.length
      ? `${nomes[0][0]}${nomes.length > 1 ? nomes[nomes.length - 1][0] : ''}`.toUpperCase()
      : '?';
  });

  constructor() {
    const aoReceber = (evento: MessageEvent<SessaoEncerrada>) => {
      if (evento.data?.tipo === 'sessao-encerrada' && evento.data.sessao === this.sessao?.id) {
        this.encerrarPorOutraAba();
      }
    };
    const aoMudarStorage = (evento: StorageEvent) => this.verificarSessaoPersistida(evento);
    this.canal?.addEventListener('message', aoReceber);
    window.addEventListener('storage', aoMudarStorage);
    inject(DestroyRef).onDestroy(() => {
      this.canal?.close();
      window.removeEventListener('storage', aoMudarStorage);
    });
  }

  /**
   * Inicia a sessão. `lembrarDeMim` controla onde o token/usuário ficam
   * persistidos — LocalStorage (sobrevive ao fechar o navegador) quando
   * true, SessionStorage (expira ao fechar a aba/navegador) quando false.
   * Cobre os critérios "Persistência de Sessão" / "Sessão Volátil (Padrão)"
   * da issue "WEB: Auth - Funcionalidade 'Lembrar de mim' no Login" (#130).
   */
  iniciar(token: string, usuario: UsuarioSessao, lembrarDeMim = true): void {
    this.limparStorages();
    const storage = lembrarDeMim ? localStorage : sessionStorage;
    const id = crypto.randomUUID();
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(SESSAO_KEY, id);
    this.sessao = { id, token, area: lembrarDeMim ? 'local' : 'session' };
    this.salvarUsuario(usuario, storage);
  }

  atualizarPerfil(curso: string, periodo: string): void {
    const usuario = this.usuario();
    if (usuario)
      this.salvarUsuario({ ...usuario, curso, periodo }, this.storageAtivo() ?? localStorage);
  }

  logout(): void {
    this.limpar();
    void this.router.navigate(['/login']);
  }

  get token(): string | null {
    return obterTokenSessao();
  }

  /**
   * Encerra a sessão desta aba (logout, sessão recusada pelo servidor ou troca de conta)
   * e avisa as outras abas da mesma sessão para fazerem o mesmo.
   */
  limpar(): void {
    const encerrada = this.sessao?.id ?? this.storageAtivo()?.getItem(SESSAO_KEY);
    this.limparStorages();
    this.sessao = null;
    this.usuarioAtual.set(null);
    if (encerrada)
      this.canal?.postMessage({
        tipo: 'sessao-encerrada',
        sessao: encerrada,
      } satisfies SessaoEncerrada);
  }

  /**
   * Rede de segurança para a sessão persistida (Lembrar de mim): se outra aba removeu ou
   * trocou o token do LocalStorage, esta aba não pode continuar mostrando a conta antiga.
   * Sessões só desta aba (SessionStorage) não são afetadas.
   */
  private verificarSessaoPersistida(evento: StorageEvent): void {
    if (this.sessao?.area !== 'local' || evento.storageArea !== localStorage) return;
    if (evento.key !== null && evento.key !== TOKEN_KEY) return;
    if (localStorage.getItem(TOKEN_KEY) !== this.sessao.token) this.encerrarPorOutraAba();
  }

  /**
   * Outra aba encerrou esta mesma sessão. Apaga só o que é desta aba: o LocalStorage já foi
   * alterado pela outra aba e pode até guardar uma conta nova; contas e catálogo locais ficam.
   */
  private encerrarPorOutraAba(): void {
    if (this.sessao?.area === 'session') {
      [TOKEN_KEY, USUARIO_KEY, SESSAO_KEY].forEach((chave) => sessionStorage.removeItem(chave));
    }
    this.sessao = null;
    this.usuarioAtual.set(null);
    this.recarregar(`/login?motivo=${MOTIVO_SESSAO_ENCERRADA}`);
  }

  private salvarUsuario(usuario: UsuarioSessao, storage: Storage): void {
    storage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    this.usuarioAtual.set(usuario);
  }

  private limparStorages(): void {
    for (const storage of [localStorage, sessionStorage]) {
      [TOKEN_KEY, USUARIO_KEY, SESSAO_KEY].forEach((chave) => storage.removeItem(chave));
    }
  }

  /** Storage (local ou session) onde a sessão atual está guardada, se houver. */
  private storageAtivo(): Storage | null {
    if (localStorage.getItem(TOKEN_KEY)) return localStorage;
    if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
    return null;
  }

  private restaurarUsuario(): UsuarioSessao | null {
    try {
      const storage = this.storageAtivo();
      if (!storage) return null;
      // Sessões abertas antes da #164 não têm id: cria um para que esta aba possa ser avisada.
      const id = storage.getItem(SESSAO_KEY) ?? crypto.randomUUID();
      storage.setItem(SESSAO_KEY, id);
      this.sessao = {
        id,
        token: storage.getItem(TOKEN_KEY)!,
        area: storage === localStorage ? 'local' : 'session',
      };
      const usuario: unknown = JSON.parse(storage.getItem(USUARIO_KEY) ?? 'null');
      if (
        usuario &&
        typeof usuario === 'object' &&
        'nome' in usuario &&
        typeof usuario.nome === 'string' &&
        usuario.nome.trim() &&
        'email' in usuario &&
        typeof usuario.email === 'string' &&
        'curso' in usuario &&
        typeof usuario.curso === 'string' &&
        'periodo' in usuario &&
        typeof usuario.periodo === 'string'
      ) {
        return {
          nome: usuario.nome,
          email: usuario.email,
          curso: usuario.curso,
          periodo: usuario.periodo,
        };
      }
    } catch {
      // Uma sessão antiga ou inválida não deve impedir a abertura da aplicação.
    }
    return null;
  }
}
