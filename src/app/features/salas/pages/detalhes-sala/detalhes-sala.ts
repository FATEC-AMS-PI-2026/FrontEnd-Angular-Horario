import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, combineLatest, concat, exhaustMap, map, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { SalasApiService } from '../../services/salas-api';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { SalaResumo } from '../../models/sala-resumo';
import { CabecalhoSala } from '../../components/cabecalho-sala/cabecalho-sala';
import { RelogioService } from '../../services/relogio';
import { AlocacaoSalaApi, calcularDisponibilidade, DisponibilidadeSalaService } from '../../services/disponibilidade-sala';

interface EstadoDetalhes {
  sala?: SalaResumo;
  carregando?: boolean;
  erro?: string;
  agenda?: AlocacaoSalaApi[];
  erroAgenda?: string;
}

@Component({
  selector: 'app-detalhes-sala',
  imports: [RouterLink, CabecalhoSala],
  templateUrl: './detalhes-sala.html',
  styleUrl: './detalhes-sala.scss',
})
export class DetalhesSala {
  private readonly route = inject(ActivatedRoute);
  private readonly salas = inject(SalasApiService);
  private readonly horarios = inject(DisponibilidadeSalaService);
  private readonly erros = inject(ApiErrorService);
  private readonly relogio = inject(RelogioService);
  private readonly recarregar = new Subject<void>();
  private readonly agora = toSignal(timer(0, 1000).pipe(map(() => this.relogio.agora())),
    { initialValue: this.relogio.agora() });

  protected readonly estado = toSignal(combineLatest([
    this.route.paramMap, this.recarregar.pipe(startWith(undefined)),
  ]).pipe(switchMap(([params]) => {
    const parametro = params.get('id') ?? '';
    const id = Number(parametro);
    if (!/^\d+$/.test(parametro) || !Number.isSafeInteger(id) || id <= 0) {
      return of<EstadoDetalhes>({ erro: 'Sala não encontrada. Identificador inválido.' });
    }
    return this.salas.obterPorId(id).pipe(
      switchMap(sala => {
        if (!this.horarios.agendaCompleta) {
          return of<EstadoDetalhes>({ sala, erroAgenda: 'Não foi possível confirmar a agenda completa desta sala.' });
        }
        // Atualiza a agenda e a vigência sem precisar recarregar a página.
        return timer(0, 60000).pipe(exhaustMap(() => concat(
          of<EstadoDetalhes>({ sala }),
          this.horarios.carregar(id).pipe(
            map(agenda => ({ sala, agenda } as EstadoDetalhes)),
            catchError(erro => of<EstadoDetalhes>({ sala,
              erroAgenda: this.erros.mensagem(erro, 'Não foi possível consultar a disponibilidade.') })),
          ),
        )));
      }),
      catchError(erro => of<EstadoDetalhes>({ erro: erro instanceof HttpErrorResponse && erro.status === 404
        ? 'Sala não encontrada.' : this.erros.mensagem(erro, 'Não foi possível carregar a sala.') })),
      startWith<EstadoDetalhes>({ carregando: true }),
    );
  })), { initialValue: { carregando: true } as EstadoDetalhes });

  protected readonly disponibilidade = computed(() => {
    const estado = this.estado();
    return estado.sala && estado.agenda
      ? calcularDisponibilidade(estado.sala.id, estado.agenda, this.agora()) : undefined;
  });

  protected tentarNovamente(): void { this.recarregar.next(); }
}
