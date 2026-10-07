import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { PageResponse } from '../../../core/models/page-response';
import { SalaApi, SalaResumo } from '../models/sala-resumo';
import { RecursoSala, RecursoSalaApi } from '../models/recurso-sala';
import { map } from 'rxjs';

/**
 * Quantidade pedida por página. O backend pagina por padrão (10 itens), mas a
 * listagem ainda não tem paginação na tela — então pedimos tudo de uma vez.
 */
const TAMANHO_PAGINA = 200;

function paraSalaResumo(sala: SalaApi): SalaResumo {
  return { id: sala.id, nome: sala.codigo, capacidade: sala.capacidade, tipo: sala.tipoSala.nome };
}

function paraRecursoSala(item: RecursoSalaApi): RecursoSala {
  return { nome: item.recurso.nome, tipo: item.recurso.tipo?.nome ?? null, quantidade: item.quantidade };
}

/**
 * Listagem de salas vinda do backend Java (`GET /salas`), cobrindo a issue
 * #132 e detalhes #133. Somente atributos fornecidos pelo Java são mapeados.
 */
@Injectable({ providedIn: 'root' })
export class SalasApiService {
  private readonly http = inject(HttpClient);
  private readonly erros = inject(ApiErrorService);
  private readonly baseUrl = inject(BACKEND_CONFIG).url.replace(/\/+$/, '');

  private readonly salasSignal = signal<SalaResumo[]>([]);
  private readonly carregandoSignal = signal(false);
  private readonly erroSignal = signal<string | null>(null);

  readonly salas = this.salasSignal.asReadonly();
  readonly carregando = this.carregandoSignal.asReadonly();
  /** Mensagem pronta para a tela quando a última carga falhou. */
  readonly erro = this.erroSignal.asReadonly();

  obterPorId(id: number) {
    return this.http.get<SalaApi>(`${this.baseUrl}/salas/${id}`).pipe(map(paraSalaResumo));
  }

  private readonly config = inject(BACKEND_CONFIG);

  /** `/recurso-sala` só é consultado quando o módulo foi liberado no environment. */
  get recursosIntegrados(): boolean {
    return this.config.habilitado || (this.config.modulos ?? []).includes('recurso-sala');
  }

  /** Todos os recursos de uma vez, agrupados pelo ID da sala, para os cards da lista (#149). */
  listarRecursosPorSala() {
    return this.http
      .get<PageResponse<RecursoSalaApi>>(`${this.baseUrl}/recurso-sala`, { params: { page: 0, size: TAMANHO_PAGINA } })
      .pipe(map(pagina => {
        const porSala = new Map<number, RecursoSala[]>();
        for (const item of pagina.content) {
          if (item.sala?.id == null) continue;
          porSala.set(item.sala.id, [...(porSala.get(item.sala.id) ?? []), paraRecursoSala(item)]);
        }
        return porSala;
      }));
  }

  /** Os recursos da sala ficam num endpoint separado da sala (`/recurso-sala`), #149. */
  obterRecursos(salaId: number) {
    return this.http
      .get<PageResponse<RecursoSalaApi>>(`${this.baseUrl}/recurso-sala`, { params: { salaId, page: 0, size: TAMANHO_PAGINA } })
      .pipe(map(pagina => pagina.content.map(paraRecursoSala)));
  }

  carregar(): void {
    this.carregandoSignal.set(true);
    this.erroSignal.set(null);

    this.http
      .get<PageResponse<SalaApi>>(`${this.baseUrl}/salas`, { params: { page: 0, size: TAMANHO_PAGINA } })
      .subscribe({
        next: (pagina) => {
          this.salasSignal.set(pagina.content.map(paraSalaResumo));
          this.carregandoSignal.set(false);
        },
        error: (erro: unknown) => {
          this.erroSignal.set(this.erros.mensagem(erro, 'Não foi possível carregar as salas.'));
          this.carregandoSignal.set(false);
        },
      });
  }
}
