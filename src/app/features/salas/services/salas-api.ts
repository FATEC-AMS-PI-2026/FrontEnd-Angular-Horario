import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { PageResponse } from '../../../core/models/page-response';
import { SalaApi, SalaResumo } from '../models/sala-resumo';

/**
 * Quantidade pedida por página. O backend pagina por padrão (10 itens), mas a
 * listagem ainda não tem paginação na tela — então pedimos tudo de uma vez.
 */
const TAMANHO_PAGINA = 200;

function paraSalaResumo(sala: SalaApi): SalaResumo {
  return { id: sala.id, nome: sala.codigo, capacidade: sala.capacidade, tipo: sala.tipoSala.nome };
}

/**
 * Listagem de salas vinda do backend Java (`GET /salas`), cobrindo a issue
 * #132. A página de detalhes ainda usa o mock de `SalasService`, porque o
 * backend não tem equipamentos, horários nem alertas da sala (#109).
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
