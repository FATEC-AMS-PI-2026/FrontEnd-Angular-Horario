import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize, timer } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { ApiErrorService } from '../../core/services/api-error.service';
import { DashboardService, GradeIndisponivelError } from './services/dashboard.service';
import { AlocacaoResponse, dataAcademica, horarioAcademico } from './models/grade-dia.model';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
    readonly session = inject(SessionService);
    private readonly service = inject(DashboardService);
    private readonly apiError = inject(ApiErrorService);
    private readonly destroyRef = inject(DestroyRef);
    private requisicao?: Subscription;
    private dataSolicitada = '';
    readonly agora = signal(new Date());
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
    readonly proxima = computed(() =>
        this.alocacoes().find(item => item.blocoHorario.horaInicio > horarioAcademico(this.agora())));
    readonly stats = computed(() => [
        { title: 'Aulas hoje', value: String(this.alocacoes().length), subtitle: this.currentDay() },
        { title: 'Professores', value: String(new Set(this.alocacoes().map(item => item.professor.id)).size), subtitle: 'Nas aulas de hoje' },
        { title: 'Próxima aula', value: this.proxima()?.blocoHorario.horaInicio.slice(0, 5) ?? '—', subtitle: this.proxima()?.disciplina.nome ?? 'Sem próxima aula hoje' },
        { title: 'Aula em andamento', value: this.emAndamento()[0]?.blocoHorario.horaInicio.slice(0, 5) ?? '—', subtitle: this.emAndamento().map(item => item.disciplina.nome).join(' · ') || 'Nenhuma aula neste momento' },
    ]);
    readonly salasHoje = computed(() => {
        const salas = new Map<number, { id: number; codigo: string; disciplinas: Set<string> }>();
        for (const item of this.alocacoes()) {
            const sala = salas.get(item.sala.id) ?? { ...item.sala, disciplinas: new Set<string>() };
            sala.disciplinas.add(item.disciplina.nome);
            salas.set(item.sala.id, sala);
        }
        return [...salas.values()].map(sala => ({
            ...sala, disciplinas: [...sala.disciplinas].join(' · '),
        }));
    });
    readonly statusSalas = computed(() => this.salasHoje().map(sala => {
        const aulas = this.emAndamento().filter(item => item.sala.id === sala.id);
        return {
            ...sala,
            emAula: aulas.length > 0,
            professor: [...new Set(aulas.map(item => item.professor.nome))].join(' · '),
            // A grade pessoal não comprova disponibilidade global nem manutenção da sala.
            label: aulas.length ? 'Sua aula em andamento' : 'Sem aula sua agora',
        };
    }));

    ngOnInit(): void {
        this.carregar();
        timer(30_000, 30_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.agora.set(new Date());
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
