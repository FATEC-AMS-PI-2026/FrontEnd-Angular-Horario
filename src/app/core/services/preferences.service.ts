import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly preferencias = this.restaurar();
  private readonly escuro = signal(this.preferencias.modoEscuro);
  private readonly avisos = signal(this.preferencias.notificacoes);
  readonly modoEscuro = this.escuro.asReadonly();
  readonly notificacoes = this.avisos.asReadonly();
  readonly erroPersistencia = signal('');

  constructor() {
    this.aplicarTema();
  }

  definirModoEscuro(ativo: boolean): void {
    this.escuro.set(ativo);
    this.aplicarTema();
    this.salvar();
  }

  definirNotificacoes(ativo: boolean): void {
    this.avisos.set(ativo);
    this.salvar();
  }

  private aplicarTema(): void {
    this.document.documentElement.setAttribute('data-theme', this.modoEscuro() ? 'dark' : 'light');
  }

  private salvar(): void {
    try {
      localStorage.setItem('gini_preferencias', JSON.stringify({
        modoEscuro: this.modoEscuro(), notificacoes: this.notificacoes(),
      }));
      this.erroPersistencia.set('');
    } catch {
      this.erroPersistencia.set('Não foi possível salvar as preferências neste navegador.');
    }
  }

  private restaurar(): { modoEscuro: boolean; notificacoes: boolean } {
    try {
      const valor: unknown = JSON.parse(localStorage.getItem('gini_preferencias') ?? '{}');
      if (valor && typeof valor === 'object') {
        return {
          modoEscuro: 'modoEscuro' in valor && valor.modoEscuro === true,
          notificacoes: !('notificacoes' in valor) || valor.notificacoes !== false,
        };
      }
    } catch {
      // Preferências inválidas usam os valores padrão.
    }
    return { modoEscuro: false, notificacoes: true };
  }
}
