import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface UsuarioSessao {
  nome: string;
  email: string;
  curso: string;
  periodo: string;
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

  iniciar(token: string, usuario: UsuarioSessao): void {
    localStorage.setItem('gini_token', token);
    this.salvarUsuario(usuario);
  }

  atualizarPerfil(curso: string, periodo: string): void {
    const usuario = this.usuario();
    if (usuario) this.salvarUsuario({ ...usuario, curso, periodo });
  }

  logout(): void {
    localStorage.removeItem('gini_token');
    localStorage.removeItem('gini_usuario');
    this.usuarioAtual.set(null);
    void this.router.navigate(['/login']);
  }

  private salvarUsuario(usuario: UsuarioSessao): void {
    localStorage.setItem('gini_usuario', JSON.stringify(usuario));
    this.usuarioAtual.set(usuario);
  }

  private restaurarUsuario(): UsuarioSessao | null {
    try {
      if (!localStorage.getItem('gini_token')) return null;
      const usuario: unknown = JSON.parse(localStorage.getItem('gini_usuario') ?? 'null');
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
