import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, defer, finalize, take, timer } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { ApiErrorService } from '../../core/services/api-error.service';
import { DashboardService, GradeIndisponivelError } from './services/dashboard.service';
import { AlocacaoResponse, dataAcademica, horarioAcademico } from './models/grade-dia.model';
import { intervalosDaGrade } from './models/intervalos-grade';
import { ConsultaSalasService } from '../salas/services/consulta-salas';
import { SalasApiService } from '../salas/services/salas-api';
import { StatusSalaBadge } from '../salas/components/status-sala-badge';
import { codigoSala } from '../salas/services/salas-locais';
import { RelogioService } from '../salas/services/relogio';
import { mapearSalasHoje } from './services/salas-hoje';
import { CARREGAR_GRADE_SEMANAL } from '../horarios/services/grade-semanal-source';
import { SalaResumo } from '../salas/models/sala-resumo';
import { atribuirCores, embaralhar, PALETA_MATERIAS } from '../../shared/utils/cores-materia';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink, StatusSalaBadge],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
    providers: [ConsultaSalasService, SalasApiService],
})
export class Dashboard implements OnInit {
    readonly session = inject(SessionService);
    readonly salas = inject(ConsultaSalasService);
    private readonly relogio = inject(RelogioService);
    private readonly service = inject(DashboardService);
    private readonly apiError = inject(ApiErrorService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly carregarGradeSemanal = inject(CARREGAR_GRADE_SEMANAL, { optional: true });
    private requisicao?: Subscription;
    private requisicaoSemana?: Subscription;
    private dataSolicitada = '';
    readonly agora = signal(this.relogio.agora());
    readonly alocacoes = signal<AlocacaoResponse[]>([]);
    readonly loading = signal(false);
    readonly carregado = signal(false);
    /** Códigos das salas da grade pessoal recorrente; só definem a ordem do status. */
    readonly salasDaSemana = signal<string[]>([]);
    readonly indisponivel = signal(false);
    readonly errorMessage = signal('');
    // Sorteada de novo a cada carregamento, para a cor não ficar presa à matéria (#113).
    private readonly paleta = signal(embaralhar(PALETA_MATERIAS));
    readonly cores = computed(() =>
        atribuirCores(this.alocacoes().map(aula => aula.disciplina.nome), this.paleta()));
    readonly currentDay = computed(() => new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', weekday: 'long',
    }).format(this.agora()));
    readonly currentTime = computed(() => horarioAcademico(this.agora()).slice(0, 5));
    readonly currentDate = computed(() => new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(this.agora()));
    readonly emAndamento = computed(() => {
        const hora = horarioAcademico(this.agora());
        return this.alocacoes().filter(item =>
            item.blocoHorario.horaInicio <= hora && hora < item.blocoHorario.horaFim);
    });
    readonly proxima = computed(() => {
        const nome = (valor: string) => valor.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
        const atuais = new Set(this.emAndamento().map(aula => nome(aula.disciplina.nome)));
        return this.alocacoes().find(item => item.blocoHorario.horaInicio > horarioAcademico(this.agora()) &&
            !atuais.has(nome(item.disciplina.nome)));
    });
    readonly intervalos = computed(() => intervalosDaGrade(this.alocacoes()));
    readonly intervaloAtual = computed(() => this.intervalos().find(intervalo =>
        intervalo.horaInicio <= horarioAcademico(this.agora()) && horarioAcademico(this.agora()) < intervalo.horaFim));
    readonly horarios = computed(() => [
        ...this.alocacoes().map(aula => ({
            id: `aula-${aula.id}`, horaInicio: aula.blocoHorario.horaInicio,
            horaFim: aula.blocoHorario.horaFim, aula, cor: this.cores().get(aula.disciplina.nome)
        })),
        ...this.intervalos().map(intervalo => ({ ...intervalo, aula: null, cor: undefined })),
    ].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)));
    readonly stats = computed(() => [
        { title: 'Aulas hoje', value: String(this.alocacoes().length), subtitle: this.currentDay() },
        { title: 'Professores', value: (this.alocacoes().some(item => item.professor === null) ? 'Não informado' : String(new Set(this.alocacoes().map(item => item.professor!.id)).size)), subtitle: 'Nas aulas de hoje' },
        { title: 'Próxima aula', value: this.proxima()?.blocoHorario.horaInicio.slice(0, 5) ?? '—', subtitle: this.proxima()?.disciplina.nome ?? 'Sem próxima aula hoje', professor: this.proxima() ? this.nomeProfessor(this.proxima()!) : null },
        { title: 'Aula em andamento', value: (this.emAndamento()[0]?.blocoHorario.horaInicio ?? this.intervaloAtual()?.horaInicio)?.slice(0, 5) ?? '—', subtitle: this.emAndamento().map(item => item.disciplina.nome).join(' · ') || (this.intervaloAtual() ? '(intervalo)' : 'Nenhuma aula neste momento') },
    ]);
    readonly salasHoje = computed(() => mapearSalasHoje(this.alocacoes(), this.salas.salas()));
    /** Salas do aluno primeiro (as de hoje antes das demais da semana), depois as outras. */
    readonly statusSalas = computed(() => {
        const hoje = new Set(this.salasHoje().map(sala => sala.chave));
        const semana = new Set(this.salasDaSemana());
        const ordem = (sala: SalaResumo) => hoje.has(codigoSala(sala.nome)) ? 0 : semana.has(codigoSala(sala.nome)) ? 1 : 2;
        return [...this.salas.salas()].sort((a, b) => ordem(a) - ordem(b) ||
            a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
            .map(sala => ({ sala, doAluno: ordem(sala) < 2, disponibilidade: this.salas.disponibilidade(sala, this.agora()) }));
    });
    readonly gruposSalas = computed(() => {
        const itens = this.statusSalas();
        if (!itens.some(item => item.doAluno)) return itens.length ? [{ titulo: null, itens }] : [];
        return [
            { titulo: 'Suas salas', itens: itens.filter(item => item.doAluno) },
            { titulo: 'Outras salas', itens: itens.filter(item => !item.doAluno) },
        ].filter(grupo => grupo.itens.length);
    });
    readonly avisoSalas = computed(() => {
        const falhas = [this.salas.erro(), this.salas.estadoAgenda().erro].filter(Boolean);
        return falhas.length ? [...new Set(falhas)].join(' ') : null;
    });

    nomeProfessor(aula: AlocacaoResponse): string {
        return aula.professor?.nome?.trim() || 'Professor a definir';
    }

    ngOnInit(): void {
        this.carregar();
        timer(1000, 1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.agora.set(this.relogio.agora());
            if (dataAcademica(this.agora()) !== this.dataSolicitada) this.carregar();
        });
    }

    carregar(): void {
        this.carregarSalasDaSemana();
        this.requisicao?.unsubscribe();
        this.dataSolicitada = dataAcademica(this.agora());
        this.loading.set(true);
        this.carregado.set(false);
        this.indisponivel.set(false);
        this.errorMessage.set('');
        this.alocacoes.set([]);
        this.paleta.set(embaralhar(PALETA_MATERIAS));
        this.requisicao = this.service.carregarDia(this.dataSolicitada).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading.set(false)),
        ).subscribe({
            next: alocacoes => {
                this.alocacoes.set(alocacoes);
                this.carregado.set(true);
            },
            error: (error: unknown) => {
                if (error instanceof GradeIndisponivelError) {
                    this.indisponivel.set(true);
                } else {
                    this.errorMessage.set(this.apiError.mensagem(error,
                        'Não foi possível carregar suas aulas. Tente novamente.'));
                }
            },
        });
    }

    private carregarSalasDaSemana(): void {
        this.requisicaoSemana?.unsubscribe();
        if (!this.carregarGradeSemanal) return;
        this.requisicaoSemana = defer(() => this.carregarGradeSemanal!()).pipe(
            take(1), takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: alocacoes => this.salasDaSemana.set(Array.isArray(alocacoes)
                ? [...new Set(alocacoes.flatMap(aula => aula?.sala?.codigo?.trim() ? [codigoSala(aula.sala.codigo)] : []))]
                : []),
            // Sem a grade semanal, a prioridade recai nas salas de hoje; a falha aparece em Horários.
            error: () => this.salasDaSemana.set([]),
        });
    }
}
