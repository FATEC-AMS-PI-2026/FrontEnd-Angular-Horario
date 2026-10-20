import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { SalaResumo } from '../models/sala-resumo';
import { ler, paginaDaApi } from '../../../shared/utils/resposta-api';
import { EMPTY, Subscription, expand, map, reduce } from 'rxjs';
import { predioDaSala } from './localizacao-sala';

/**
 * Quantidade pedida por página. A tela apresenta a lista completa, depois
 * que todas as páginas forem consultadas com sucesso.
 */
const TAMANHO_PAGINA = 200;

function paraSalaResumo(sala: unknown): SalaResumo {
  const id = ler(sala, 'id'), codigo = ler(sala, 'codigo'), capacidade = ler(sala, 'capacidade');
  const tipo = ler(ler(sala, 'tipoSala'), 'nome');
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 ||
      typeof codigo !== 'string' || !codigo.trim() ||
      typeof capacidade !== 'number' || !Number.isSafeInteger(capacidade) || capacidade < 0 ||
      typeof tipo !== 'string' || !tipo.trim()) {
    throw new Error('Cadastro de sala inválido.');
  }
  return { id, nome: codigo, capacidade, tipo, predio: predioDaSala(codigo, tipo) };
}

/**
 * Listagem de salas vinda do backend Java (`GET /salas`), cobrindo a issue
 * #132 e detalhes #133. O prédio segue a localização confirmada pelo usuário;
 * os demais atributos são fornecidos pelo Java.
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
    return this.http.get<unknown>(`${this.baseUrl}/salas/${id}`).pipe(map(paraSalaResumo));
  }

  carregar(): void {
    this.consulta?.unsubscribe();
    this.carregandoSignal.set(true);
    this.erroSignal.set(null);
    this.salasSignal.set([]);

    let totalEsperado: number | undefined;
    const pagina = (page: number) => this.http.get<unknown>(`${this.baseUrl}/salas`, {
      params: { page, size: TAMANHO_PAGINA },
    }).pipe(map(resposta => {
      const p = paginaDaApi(resposta, page, totalEsperado);
      totalEsperado = p.totalPages;
      return p;
    }));
    this.consulta = pagina(0).pipe(
      expand(p => p.page + 1 < p.totalPages ? pagina(p.page + 1) : EMPTY),
      map(p => p.content),
      reduce((todas, itens) => todas.concat(itens), [] as unknown[]),
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
