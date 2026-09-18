import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface UsuarioSessao {
  nome: string;
  email: string;
  curso: string;
  periodo: string;
}

const TOKEN_KEY = 'gini_token';
const USUARIO_KEY = 'gini_usuario';

/** Leitura comum para Services e guardas, independentemente de Lembrar de mim. */
export function obterTokenSessao(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly router = inject(Router);
  private readonly usuarioAtual = signal<UsuarioSessao | null>(this.restaurarUsuario());
  readonly usuario = this.usuarioAtual.asReadonly();
  readonly identificacao = computed(() => {
    const usuario = this.usuario();
    return [usuario?.curso, usuario?.periodo].filter(Boolean).join(' · ') || 'Perfil não configurado';
  });
  readonly iniciais = computed(() => {
    const nomes = this.usuario()?.nome.trim().split(/\s+/) ?? [];
    return nomes.length ? `${nomes[0][0]}${nomes.length > 1 ? nomes[nomes.length - 1][0] : ''}`.toUpperCase() : '?';
  });

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
    storage.setItem(TOKEN_KEY, token);
    this.salvarUsuario(usuario, storage);
  }

  atualizarPerfil(curso: string, periodo: string): void {
    const usuario = this.usuario();
    if (usuario) this.salvarUsuario({ ...usuario, curso, periodo }, this.storageAtivo() ?? localStorage);
  }

  logout(): void {
    this.limpar();
    void this.router.navigate(['/login']);
  }

  get token(): string | null {
    return obterTokenSessao();
  }

  limpar(): void {
    this.limparStorages();
    // TEMPORÁRIO: excluir esta limpeza do progresso demo após integrar o backend Java.
    localStorage.removeItem('gini_demo_perfil');
    sessionStorage.removeItem('gini_demo_perfil');
    this.usuarioAtual.set(null);
  }

  private salvarUsuario(usuario: UsuarioSessao, storage: Storage): void {
    storage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    this.usuarioAtual.set(usuario);
  }

  private limparStorages(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USUARIO_KEY);
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
      const usuario: unknown = JSON.parse(storage.getItem(USUARIO_KEY) ?? 'null');
      if (usuario && typeof usuario === 'object' &&
        'nome' in usuario && typeof usuario.nome === 'string' && usuario.nome.trim() &&
        'email' in usuario && typeof usuario.email === 'string' &&
        'curso' in usuario && typeof usuario.curso === 'string' &&
        'periodo' in usuario && typeof usuario.periodo === 'string') {
        return { nome: usuario.nome, email: usuario.email, curso: usuario.curso, periodo: usuario.periodo };
      }
    } catch {
      // Uma sessão antiga ou inválida não deve impedir a abertura da aplicação.
    }
    return null;
  }
}
