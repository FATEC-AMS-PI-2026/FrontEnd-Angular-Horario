import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, exhaustMap, map, merge, of, startWith, timer } from 'rxjs';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { SalaResumo } from '../models/sala-resumo';
import { SalasApiService } from './salas-api';
import { SalasLocaisService, aulasLocaisDaSala, unirSalas } from './salas-locais';
import { AlocacaoSalaApi, DisponibilidadeSala, DisponibilidadeSalaService, aulasJavaDaSala, calcularDisponibilidade, unirAulas } from './disponibilidade-sala';
import { RelogioService } from './relogio';

interface EstadoAgenda {
  alocacoes: AlocacaoSalaApi[] | null;
  carregando: boolean;
  erro: string | null;
}

/** Consulta compartilhada pela lista e dashboard, com uma instância por página. */
@Injectable()
export class ConsultaSalasService {
  private readonly api = inject(SalasApiService);
  readonly locais = inject(SalasLocaisService);
  private readonly horarios = inject(DisponibilidadeSalaService);
  private readonly erros = inject(ApiErrorService);
  private readonly relogio = inject(RelogioService);
  private readonly recarregarAgenda = new Subject<void>();
  readonly salas = computed(() => unirSalas(this.api.erro() ? [] : this.api.salas(), this.locais.salas()));
  readonly carregando = computed(() => this.api.carregando() || this.locais.carregando());
  readonly erro = this.api.erro;
  readonly estadoAgenda = toSignal(this.horarios.agendaCompleta
    ? merge(timer(0, 60_000), this.recarregarAgenda).pipe(exhaustMap(() => this.horarios.carregar().pipe(
      map(alocacoes => ({ alocacoes, carregando: false, erro: null } as EstadoAgenda)),
      catchError(erro => of<EstadoAgenda>({ alocacoes: null, carregando: false,
        erro: this.erros.mensagem(erro, 'Não foi possível consultar a disponibilidade das salas.') })),
      startWith<EstadoAgenda>({ alocacoes: null, carregando: true, erro: null }),
    ))) : of<EstadoAgenda>({ alocacoes: null, carregando: false, erro: null }),
    { initialValue: { alocacoes: null, carregando: this.horarios.agendaCompleta, erro: null } as EstadoAgenda });
  readonly agora = toSignal(timer(0, 1000).pipe(map(() => this.relogio.agora())),
    { initialValue: this.relogio.agora() });

  constructor() { this.api.carregar(); }

  disponibilidade(sala: SalaResumo, agora = this.agora()): DisponibilidadeSala | undefined {
    // Manutenção só pode ser informada pelo cadastro, nunca inferida dos recursos.
    if (sala.status === 'Manutenção') return { status: sala.status, texto: 'Manutenção' };
    const agenda = this.estadoAgenda().alocacoes;
    if (sala.origem === 'local' || !agenda || this.locais.carregando() || this.locais.erro()) return undefined;
    return calcularDisponibilidade(sala.id, agenda, agora, this.aulas(sala, agora).filter(a => a.origem === 'local'));
  }

  aulas(sala: SalaResumo, agora = this.agora()) {
    const java = sala.origem === 'local' ? [] : aulasJavaDaSala(sala.id, this.estadoAgenda().alocacoes ?? [], agora);
    const locais = this.locais.erro() ? [] : aulasLocaisDaSala(this.locais.catalogo(), sala.nome, agora);
    return unirAulas(java, locais);
  }

  tentarNovamente(): void {
    if (this.erro()) this.api.carregar();
    if (this.estadoAgenda().erro) this.tentarDisponibilidade();
  }

  tentarDisponibilidade(): void { this.recarregarAgenda.next(); }
}
