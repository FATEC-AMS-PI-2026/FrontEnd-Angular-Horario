import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { PageResponse } from '../../../core/models/page-response';
import { SalaApi, SalaResumo } from '../models/sala-resumo';
import { EMPTY, Subscription, expand, map, reduce } from 'rxjs';

/**
 * Quantidade pedida por página. A tela apresenta a lista completa, depois
 * que todas as páginas forem consultadas com sucesso.
 */
const TAMANHO_PAGINA = 200;

function paraSalaResumo(sala: SalaApi): SalaResumo {
  if (!sala || !Number.isSafeInteger(sala.id) || sala.id <= 0 ||
      typeof sala.codigo !== 'string' || !sala.codigo.trim() ||
      !Number.isSafeInteger(sala.capacidade) || sala.capacidade < 0 ||
      typeof sala.tipoSala?.nome !== 'string' || !sala.tipoSala.nome.trim()) {
    throw new Error('Cadastro de sala inválido.');
  }
  return { id: sala.id, nome: sala.codigo, capacidade: sala.capacidade, tipo: sala.tipoSala.nome };
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
  private consulta?: Subscription;

  private readonly salasSignal = signal<SalaResumo[]>([]);
  private readonly carregandoSignal = signal(false);
  private readonly erroSignal = signal<string | null>(null);

  readonly salas = this.salasSignal.asReadonly();
  readonly carregando = this.carregandoSignal.asReadonly();
  /** Mensagem pronta para a tela quando a última carga falhou. */
  readonly erro = this.erroSignal.asReadonly();

  constructor() { inject(DestroyRef).onDestroy(() => this.consulta?.unsubscribe()); }

  obterPorId(id: number) {
    return this.http.get<SalaApi>(`${this.baseUrl}/salas/${id}`).pipe(map(paraSalaResumo));
  }

  carregar(): void {
    this.consulta?.unsubscribe();
    this.carregandoSignal.set(true);
    this.erroSignal.set(null);
    this.salasSignal.set([]);

    const pagina = (page: number) => this.http.get<PageResponse<SalaApi>>(`${this.baseUrl}/salas`, {
      params: { page, size: TAMANHO_PAGINA },
    }).pipe(map(p => {
      if (p.page !== page || !Number.isInteger(p.totalPages) || p.totalPages < 0 ||
          !Array.isArray(p.content) || (p.totalPages > page + 1 && !p.content.length)) {
        throw new Error('Paginação incompleta da lista de salas.');
      }
      return p;
    }));
    this.consulta = pagina(0).pipe(
      expand(p => p.page + 1 < p.totalPages ? pagina(p.page + 1) : EMPTY),
      map(p => p.content),
      reduce((todas, itens) => todas.concat(itens), [] as SalaApi[]),
      map(salas => {
        const convertidas = salas.map(paraSalaResumo);
        if (new Set(convertidas.map(s => s.id)).size !== convertidas.length) {
          throw new Error('Salas duplicadas na resposta.');
        }
        return convertidas;
      }),
    )
      .subscribe({
        next: (salas) => {
          this.salasSignal.set(salas);
          this.carregandoSignal.set(false);
        },
        error: (erro: unknown) => {
          this.erroSignal.set(this.erros.mensagem(erro, 'Não foi possível carregar as salas.'));
          this.carregandoSignal.set(false);
        },
      });
  }
}
