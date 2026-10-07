import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Subscription, expand, map, reduce } from 'rxjs';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { PageResponse } from '../../../core/models/page-response';
import { Equipamento } from '../models/equipamento';
import { RecursoSalaApi } from '../models/recurso-sala';

export function equipamentoDoRecurso(item: RecursoSalaApi): Equipamento {
  const nome = item.recurso.nome;
  const normalizado = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const tipo = /^computador(?:es)?\b/.test(normalizado) ? 'Computador'
    : /^cadeira(?:s)?\b/.test(normalizado) ? 'Cadeira'
    : /^(televisao|televisor|televisores|televisoes|tv)\b/.test(normalizado) ? 'Televisão'
    : /^wi[ -]?fi\b/.test(normalizado) ? 'Wi-Fi'
    : /^ar[ -]condicionado\b/.test(normalizado) ? 'Ar-condicionado' : nome;
  return { id: item.id, tipo, nome, categoria: item.recurso.tipo.nome, quantidadeTotal: item.quantidade };
}

/** Uma instância por página: consulta global na lista e filtrada nos detalhes. */
@Injectable()
export class RecursosSalaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(BACKEND_CONFIG);
  private readonly base = this.config.url.replace(/\/+$/, '');
  private readonly erros = inject(ApiErrorService);
  private consulta?: Subscription;
  private readonly carregado = signal(false);
  readonly habilitado = this.config.habilitado || (this.config.modulos ?? []).includes('recurso-sala');
  readonly porSala = signal<ReadonlyMap<number, Equipamento[]>>(new Map());
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  constructor() { inject(DestroyRef).onDestroy(() => this.consulta?.unsubscribe()); }

  limpar(): void {
    this.consulta?.unsubscribe();
    this.carregado.set(false);
    this.porSala.set(new Map());
    this.carregando.set(false);
    this.erro.set(null);
  }

  carregar(salaId?: number): void {
    this.limpar();
    if (!this.habilitado) return;
    this.carregando.set(true);
    const pagina = (page: number) => this.http.get<PageResponse<RecursoSalaApi>>(`${this.base}/recurso-sala`, {
      params: { page, size: 200, ...(salaId === undefined ? {} : { salaId }) },
    }).pipe(map(p => {
      if (p.page !== page || !Number.isInteger(p.totalPages) || p.totalPages < 0 ||
          !Array.isArray(p.content) || (p.totalPages > page + 1 && !p.content.length)) {
        throw new Error('Paginação inválida dos recursos.');
      }
      return p;
    }));
    this.consulta = pagina(0).pipe(
      expand(p => p.page + 1 < p.totalPages ? pagina(p.page + 1) : EMPTY),
      map(p => p.content),
      reduce((todos, itens) => todos.concat(itens), [] as RecursoSalaApi[]),
      map(itens => {
        const salas = new Map<number, Equipamento[]>();
        const vistos = new Set<number>();
        for (const item of itens) {
          if (salaId !== undefined && item.sala?.id !== salaId) continue;
          if (!Number.isSafeInteger(item.id) || !Number.isSafeInteger(item.sala?.id) ||
              !item.recurso?.nome?.trim() || !item.recurso.tipo?.nome ||
              !Number.isSafeInteger(item.quantidade) || item.quantidade < 0) {
            throw new Error('Recurso de sala inválido.');
          }
          if (vistos.has(item.id)) continue;
          vistos.add(item.id);
          salas.set(item.sala.id, [...(salas.get(item.sala.id) ?? []), equipamentoDoRecurso(item)]);
        }
        return salas;
      }),
    ).subscribe({
      next: salas => { this.porSala.set(salas); this.carregado.set(true); this.carregando.set(false); },
      error: erro => {
        this.erro.set(this.erros.mensagem(erro, 'Não foi possível consultar os recursos das salas.'));
        this.carregando.set(false);
      },
    });
  }

  /** null indica informação indisponível; [] confirma uma sala sem recursos. */
  daSala(salaId: number): Equipamento[] | null {
    return this.carregado() ? this.porSala().get(salaId) ?? [] : null;
  }
}
