import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, combineLatest, concat, exhaustMap, map, Observable, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { SalasApiService } from '../../services/salas-api';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { BackendIndisponivelError } from '../../../../core/services/backend-config';
import { SalaResumo } from '../../models/sala-resumo';
import { RecursoSala } from '../../models/recurso-sala';
import { CabecalhoSala } from '../../components/cabecalho-sala/cabecalho-sala';
import { RelogioService } from '../../services/relogio';
import { AlocacaoSalaApi, aulasJavaDaSala, calcularDisponibilidade, DisponibilidadeSalaService, unirAulas } from '../../services/disponibilidade-sala';
import { SalasLocaisService, aulasLocaisDaSala } from '../../services/salas-locais';
import { TopbarContextService } from '../../../../core/services/topbar-context.service';
import { EquipamentosCard } from '../../components/equipamentos-card/equipamentos-card';
import { ProximosHorariosCard } from '../../components/proximos-horarios-card/proximos-horarios-card';
import { AulasDoDiaCard } from '../../components/aulas-do-dia-card/aulas-do-dia-card';
import { TecnicoCard } from '../../components/tecnico-card/tecnico-card';
import { horarioAcademico } from '../../../dashboard/models/grade-dia.model';

interface EstadoRecursos { lista: RecursoSala[] | null; carregando?: boolean; erro?: string }
interface EstadoDetalhes {
  sala?: SalaResumo;
  carregando?: boolean;
  erro?: string;
  agenda?: AlocacaoSalaApi[];
  erroAgenda?: string;
}

@Component({
  selector: 'app-detalhes-sala',
  imports: [RouterLink, CabecalhoSala, EquipamentosCard, ProximosHorariosCard, AulasDoDiaCard, TecnicoCard],
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
  protected readonly locais = inject(SalasLocaisService);
  private readonly locaisCarregando = toObservable(this.locais.carregando);
  private readonly topbar = inject(TopbarContextService);
  constructor() {
    effect(() => this.topbar.sala.set(this.estado().sala?.nome ?? null));
    inject(DestroyRef).onDestroy(() => this.topbar.sala.set(null));
  }
  protected readonly agora = toSignal(timer(0, 1000).pipe(map(() => this.relogio.agora())),
    { initialValue: this.relogio.agora() });

  protected readonly estado = toSignal(combineLatest([
    this.route.paramMap, this.recarregar.pipe(startWith(undefined)),
  ]).pipe(switchMap(([params]) => {
    const parametro = params.get('id') ?? '';
    if (/^local-[1-9]\d*$/.test(parametro)) {
      return this.locaisCarregando.pipe(map(carregando => {
        if (carregando) return { carregando: true } as EstadoDetalhes;
        const sala = this.locais.salas().find(s => s.rotaId === parametro);
        return sala ? { sala } : { erro: this.locais.erro() ?? 'Sala não encontrada.' };
      }));
    }
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

  /** Recursos vêm de `/recurso-sala`, separado da sala (#149). Salas só do navegador não têm. */
  protected readonly recursos = toSignal(combineLatest([
    this.route.paramMap, this.recarregar.pipe(startWith(undefined)),
  ]).pipe(switchMap(([params]): Observable<EstadoRecursos> => {
    const parametro = params.get('id') ?? '';
    const id = Number(parametro);
    if (!/^\d+$/.test(parametro) || !Number.isSafeInteger(id) || id <= 0) return of({ lista: null });
    return this.salas.obterRecursos(id).pipe(
      map(lista => ({ lista })),
      // Sem o módulo `recurso-sala` liberado, o card segue no formato antigo em vez de mostrar erro.
      catchError(erro => of(erro instanceof BackendIndisponivelError ? { lista: null }
        : { lista: null, erro: this.erros.mensagem(erro, 'Não foi possível carregar os equipamentos.') })),
      startWith({ lista: null, carregando: true }),
    );
  })), { initialValue: { lista: null, carregando: true } as EstadoRecursos });

  protected readonly disponibilidade = computed(() => {
    const estado = this.estado();
    return estado.sala && estado.agenda
      ? calcularDisponibilidade(estado.sala.id, estado.agenda, this.agora(), this.aulas().filter(a => a.origem === 'local')) : undefined;
  });

  protected readonly aulas = computed(() => {
    const estado = this.estado();
    if (!estado.sala) return [];
    const java = aulasJavaDaSala(estado.sala.id, estado.agenda ?? [], this.agora());
    const locais = aulasLocaisDaSala(this.locais.catalogo(), estado.sala.nome, this.agora());
    return unirAulas(java, locais);
  });
  protected readonly proximos = computed(() => this.aulas()
    .filter(a => a.inicio > horarioAcademico(this.agora()).slice(0, 5))
    .map(a => ({ inicio: a.inicio, termino: a.termino, atividade: a.disciplina, professor: a.professor })));

  protected tentarNovamente(): void { this.locais.carregar(); this.recarregar.next(); }
}
