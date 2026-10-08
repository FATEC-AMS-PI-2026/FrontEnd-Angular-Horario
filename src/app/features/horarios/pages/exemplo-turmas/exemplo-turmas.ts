import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BACKEND_CONFIG } from '../../../../core/services/backend-config';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { TurmasHorariosApiService } from '../../services/turmas-horarios-api';
import { DIAS_SEMANA, DiaSemana, ItemHorario } from '../../models/item-horario';
import { Turma } from '../../models/turma';
import { CURSOS_EXEMPLO, ExemploTurmasBackend } from './exemplo-turmas-backend';

@Component({
  selector: 'app-exemplo-turmas',
  imports: [RouterLink],
  templateUrl: './exemplo-turmas.html',
  styleUrl: './exemplo-turmas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // O HttpClient deste componente nunca alcança a rede nem os outros Services da aplicação.
  providers: [
    ExemploTurmasBackend,
    { provide: HttpClient, useFactory: (backend: ExemploTurmasBackend) => new HttpClient(backend), deps: [ExemploTurmasBackend] },
    { provide: BACKEND_CONFIG, useValue: { habilitado: false, url: '/exemplo-api', modulos: ['turmas', 'alocacoes'] } },
    TurmasHorariosApiService,
  ],
})
export class ExemploTurmas implements OnInit, OnDestroy {
  protected readonly transporte = inject(ExemploTurmasBackend);
  private readonly api = inject(TurmasHorariosApiService);
  private readonly erros = inject(ApiErrorService);
  private consulta?: Subscription;
  protected readonly cursos = CURSOS_EXEMPLO;
  protected readonly cursoId = signal(1);
  protected readonly turmaId = signal<number | null>(null);
  protected readonly turmas = signal<Turma[]>([]);
  protected readonly itens = signal<ItemHorario[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly usouAlternativa = computed(() => this.transporte.consultas().some(consulta => consulta.status === 500));

  ngOnInit(): void { this.carregarTurmas(); }
  ngOnDestroy(): void { this.consulta?.unsubscribe(); }

  protected selecionarCurso(event: Event): void {
    this.cursoId.set(Number((event.target as HTMLSelectElement).value));
    this.carregarTurmas();
  }

  protected simularFalha(event: Event): void {
    this.transporte.falharTurmas.set((event.target as HTMLInputElement).checked);
    this.carregarTurmas();
  }

  protected carregarTurmas(): void {
    this.consulta?.unsubscribe();
    this.transporte.consultas.set([]);
    this.turmaId.set(null);
    this.turmas.set([]);
    this.itens.set([]);
    this.erro.set(null);
    this.carregando.set(true);
    this.consulta = this.api.listarTurmasDoCurso(this.cursoId()).subscribe({
      next: turmas => { this.turmas.set(turmas); this.carregando.set(false); },
      error: erro => this.registrarErro(erro),
    });
  }

  protected selecionarTurma(event: Event): void {
    this.consulta?.unsubscribe();
    const id = Number((event.target as HTMLSelectElement).value) || null;
    this.turmaId.set(id);
    this.itens.set([]);
    this.erro.set(null);
    if (!id) { this.carregando.set(false); return; }
    this.carregando.set(true);
    this.consulta = this.api.listarHorariosDaTurma(id).subscribe({
      next: itens => { this.itens.set(itens); this.carregando.set(false); },
      error: erro => this.registrarErro(erro),
    });
  }

  protected nomeDia(dia: DiaSemana): string { return DIAS_SEMANA.find(item => item.valor === dia)?.nome ?? ''; }
  private registrarErro(erro: unknown): void {
    this.erro.set(this.erros.mensagem(erro, 'Não foi possível carregar o exemplo.'));
    this.carregando.set(false);
  }
}
