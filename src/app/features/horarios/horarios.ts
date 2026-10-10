import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { dataAcademica, diaSemana, horarioAcademico } from '../dashboard/models/grade-dia.model';
import { RelogioService } from '../salas/services/relogio';
import { HorariosService } from './services/horarios';
import { AdicionarMateriaModal } from './components/adicionar-materia-modal/adicionar-materia-modal';
import { AulaHorario, DiaSemana, DIAS_SEMANA, ItemHorario } from './models/item-horario';
import { RouterLink } from '@angular/router';
import { EXEMPLO_TURMAS_DISPONIVEL } from './exemplo-turmas.routes';

/** Status exibido na coluna "Status": badge verde, badge cinza ou traço. */
export type StatusAula = 'em-andamento' | 'proxima' | 'nenhum';

/** Minutos desde 00:00 de um horário `HH:mm`, para comparar/ordenar. */
function paraMinutos(horario: string): number {
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
}

const DIA_ACADEMICO: Partial<Record<ReturnType<typeof diaSemana>, DiaSemana>> = {
    SEGUNDA: 'seg', TERCA: 'ter', QUARTA: 'qua', QUINTA: 'qui', SEXTA: 'sex', SABADO: 'sab',
};

/**
 * Página "Horários" (issue #103): chips de Seg a Sáb para escolher o dia e
 * uma tabela com a grade desse dia em ordem cronológica, com intervalos
 * como linhas separadoras e status dinâmico ("Em andamento" / "Próxima")
 * calculado a partir do horário atual. O botão "+ Adicionar Matéria" abre
 * o modal da issue #104.
 */
@Component({
    selector: 'app-horarios',
    standalone: true,
    imports: [AdicionarMateriaModal, RouterLink],
    templateUrl: './horarios.html',
    styleUrl: './horarios.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Horarios implements OnInit, OnDestroy {
    protected readonly exemploDisponivel = EXEMPLO_TURMAS_DISPONIVEL;
    protected readonly horariosService = inject(HorariosService);
    private readonly relogio = inject(RelogioService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly agora = signal(this.relogio.agora());

    protected readonly dias = DIAS_SEMANA;

    /** Dia de hoje na grade, ou `null` no domingo. */
    private readonly hoje = computed(() => DIA_ACADEMICO[diaSemana(dataAcademica(this.agora()))] ?? null);

    /** Dia selecionado nos chips. Abre no dia de hoje (segunda, se for domingo). */
    protected readonly diaSelecionado = signal<DiaSemana>(this.hoje() ?? 'seg');
    protected readonly dataSelecionada = computed(() => {
        // Calcular a semana em UTC a partir da data de São Paulo, sem depender do fuso do navegador.
        const data = new Date(`${dataAcademica(this.agora())}T12:00:00Z`);
        const indiceDia = DIAS_SEMANA.findIndex(dia => dia.valor === this.diaSelecionado()) + 1;
        data.setUTCDate(data.getUTCDate() + indiceDia - (data.getUTCDay() || 7));
        return data.toISOString().slice(0, 10);
    });
    protected readonly carregando = computed(() => this.horariosService.carregando() || this.horariosService.carregandoDia());
    protected readonly carregado = computed(() => this.horariosService.carregado() && this.horariosService.carregadoDia());
    protected readonly erro = computed(() => this.horariosService.erro() || this.horariosService.erroDia());

    protected readonly nomeDiaSelecionado = computed(
        () => DIAS_SEMANA.find((dia) => dia.valor === this.diaSelecionado())?.nome ?? '',
    );

    /** Aulas e intervalos do dia selecionado, em ordem cronológica. */
    protected readonly itensDoDia = this.horariosService.itensDia;

    /**
     * Status de cada aula do dia selecionado. Só existe "Em andamento" e
     * "Próxima" quando o dia selecionado é hoje; nos outros dias todas as
     * aulas ficam com traço. "Próxima" é só a primeira aula que ainda vai
     * começar — as demais futuras também ficam com traço.
     */
    protected readonly statusPorAula = computed(() => {
        const status = new Map<AulaHorario, StatusAula>();
        const aulas = this.itensDoDia().filter((item): item is AulaHorario => item.tipo === 'aula');
        const ehHoje = this.diaSelecionado() === this.hoje();

        const minutosAgora = paraMinutos(horarioAcademico(this.agora()));
        let proximaMarcada = false;

        for (const aula of aulas) {
            let atual: StatusAula = 'nenhum';
            if (ehHoje) {
                const inicio = paraMinutos(aula.inicio);
                if (minutosAgora >= inicio && minutosAgora < paraMinutos(aula.termino)) {
                    atual = 'em-andamento';
                } else if (!proximaMarcada && inicio > minutosAgora) {
                    atual = 'proxima';
                    proximaMarcada = true;
                }
            }
            status.set(aula, atual);
        }
        return status;
    });

    /** Controla o modal "Adicionar Matéria" (#104). */
    protected readonly modalAberto = signal(false);

    ngOnInit(): void {
        this.carregar();
        timer(1000, 1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            const dataAnterior = this.dataSelecionada();
            this.agora.set(this.relogio.agora());
            if (dataAnterior !== this.dataSelecionada()) this.carregar();
        });
    }

    ngOnDestroy(): void { this.horariosService.cancelarDia(); }

    protected carregar(): void {
        this.horariosService.carregar();
        this.horariosService.carregarDia(this.dataSelecionada());
    }

    protected selecionarDia(dia: DiaSemana): void {
        this.diaSelecionado.set(dia);
        this.horariosService.carregarDia(this.dataSelecionada());
    }

    protected abrirModal(): void {
        this.modalAberto.set(true);
    }

    protected fecharModal(): void {
        this.modalAberto.set(false);
    }

    /** Depois de adicionar, mostra o dia da aula nova para o aluno ver o resultado. */
    protected aulaAdicionada(dia: DiaSemana): void {
        this.selecionarDia(dia);
        this.modalAberto.set(false);
    }

    protected statusDe(aula: AulaHorario): StatusAula {
        return this.statusPorAula().get(aula) ?? 'nenhum';
    }

    /** Type guard usado no template para diferenciar aula de intervalo no `@if`. */
    protected ehAula(item: ItemHorario): item is AulaHorario {
        return item.tipo === 'aula';
    }
}
