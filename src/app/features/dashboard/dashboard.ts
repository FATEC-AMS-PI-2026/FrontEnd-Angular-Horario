import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize, timer } from 'rxjs';
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
    private requisicao?: Subscription;
    private dataSolicitada = '';
    readonly agora = signal(this.relogio.agora());
    readonly alocacoes = signal<AlocacaoResponse[]>([]);
    readonly loading = signal(false);
    readonly carregado = signal(false);
    readonly indisponivel = signal(false);
    readonly errorMessage = signal('');
    readonly currentDay = computed(() => new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', weekday: 'long',
    }).format(this.agora()));
    readonly currentTime = computed(() => horarioAcademico(this.agora()).slice(0, 5));
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
            horaFim: aula.blocoHorario.horaFim, aula
        })),
        ...this.intervalos().map(intervalo => ({ ...intervalo, aula: null })),
    ].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)));
    readonly stats = computed(() => [
        { title: 'Aulas hoje', value: String(this.alocacoes().length), subtitle: this.currentDay() },
        { title: 'Professores', value: (this.alocacoes().some(item => item.professor === null) ? 'Não informado' : String(new Set(this.alocacoes().map(item => item.professor!.id)).size)), subtitle: 'Nas aulas de hoje' },
        { title: 'Próxima aula', value: this.proxima()?.blocoHorario.horaInicio.slice(0, 5) ?? '—', subtitle: this.proxima()?.disciplina.nome ?? 'Sem próxima aula hoje', professor: this.proxima() ? this.nomeProfessor(this.proxima()!) : null },
        { title: 'Aula em andamento', value: (this.emAndamento()[0]?.blocoHorario.horaInicio ?? this.intervaloAtual()?.horaInicio)?.slice(0, 5) ?? '—', subtitle: this.emAndamento().map(item => item.disciplina.nome).join(' · ') || (this.intervaloAtual() ? '(intervalo)' : 'Nenhuma aula neste momento') },
    ]);
    readonly salasHoje = computed(() => mapearSalasHoje(this.alocacoes(), this.salas.salas()));
    readonly statusSalas = computed(() => {
        const hoje = new Set(this.salasHoje().map(sala => sala.chave));
        return [...this.salas.salas()].sort((a, b) =>
            Number(hoje.has(codigoSala(b.nome))) - Number(hoje.has(codigoSala(a.nome))) ||
            a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
            .slice(0, 4).map(sala => ({ sala, disponibilidade: this.salas.disponibilidade(sala, this.agora()) }));
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
        this.requisicao?.unsubscribe();
        this.dataSolicitada = dataAcademica(this.agora());
        this.loading.set(true);
        this.carregado.set(false);
        this.indisponivel.set(false);
        this.errorMessage.set('');
        this.alocacoes.set([]);
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
}
