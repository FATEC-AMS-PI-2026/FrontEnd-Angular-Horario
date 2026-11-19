import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TopbarContextService } from './topbar-context.service';

export const NOME_APLICACAO = 'GINI';
export const TITULO_PADRAO = 'GINI — Gestão de Horários Acadêmicos';

/**
 * Título da página atual, definido no `title` das rotas (#161). É a estratégia de título
 * do Angular, então atualiza a aba ao abrir link direto, navegar e usar voltar/avançar,
 * e o Topbar lê o mesmo valor em vez de testar trechos da URL.
 * Páginas que só sabem o título depois de carregar dados (ex.: "Escolha seu ano" depende
 * do curso) usam `sobrescrever()` e `limparSobrescrita()` ao sair.
 */
@Injectable({ providedIn: 'root' })
export class TituloPaginaService extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly contexto = inject(TopbarContextService);
  private readonly daRota = signal<string | null>(null);
  private readonly sobrescrito = signal<string | null>(null);

  /** Título exibido no Topbar; `null` quando a rota não define nenhum. */
  readonly atual = computed(() => this.sobrescrito() ?? this.daRota());

  constructor() {
    super();
    // Nos detalhes da sala o código entra antes da seção, como no breadcrumb.
    effect(() => this.title.setTitle(formatarTituloAba(this.atual(), this.contexto.sala())));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.daRota.set(this.buildTitle(snapshot) ?? null);
  }

  sobrescrever(titulo: string): void {
    this.sobrescrito.set(titulo);
  }

  limparSobrescrita(): void {
    this.sobrescrito.set(null);
  }
}

export function formatarTituloAba(titulo: string | null, detalhe: string | null = null): string {
  if (!titulo) return TITULO_PADRAO;
  return [detalhe, titulo, NOME_APLICACAO].filter(Boolean).join(' · ');
}
