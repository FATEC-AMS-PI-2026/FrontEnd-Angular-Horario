import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RelogioService } from '../salas/services/relogio';
import { HorariosService } from './services/horarios';
import { AdicionarMateriaModal } from './components/adicionar-materia-modal/adicionar-materia-modal';
import { AulaHorario, DiaSemana, DIAS_SEMANA, ItemHorario } from './models/item-horario';

/** Status exibido na coluna "Status": badge verde, badge cinza ou traço. */
export type StatusAula = 'em-andamento' | 'proxima' | 'nenhum';

/** Minutos desde 00:00 de um horário `HH:mm`, para comparar/ordenar. */
function paraMinutos(horario: string): number {
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
}

/** `Date.getDay()` (0 = domingo) → dia da grade. Domingo não tem chip. */
const DIA_POR_GETDAY: (DiaSemana | null)[] = [null, 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

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
    imports: [AdicionarMateriaModal],
    templateUrl: './horarios.html',
    styleUrl: './horarios.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Horarios implements OnInit {
    protected readonly horariosService = inject(HorariosService);
    private readonly relogio = inject(RelogioService);

    protected readonly dias = DIAS_SEMANA;

    /** Dia de hoje na grade, ou `null` no domingo. */
    private readonly hoje = DIA_POR_GETDAY[this.relogio.agora().getDay()];

    /** Dia selecionado nos chips. Abre no dia de hoje (segunda, se for domingo). */
    protected readonly diaSelecionado = signal<DiaSemana>(this.hoje ?? 'seg');

    protected readonly nomeDiaSelecionado = computed(
        () => DIAS_SEMANA.find((dia) => dia.valor === this.diaSelecionado())?.nome ?? '',
    );

    /** Aulas e intervalos do dia selecionado, em ordem cronológica. */
    protected readonly itensDoDia = computed(() =>
        this.horariosService
            .itens()
            .filter((item) => item.diaSemana === this.diaSelecionado())
            .sort((a, b) => paraMinutos(a.inicio) - paraMinutos(b.inicio)),
    );

    /**
     * Status de cada aula do dia selecionado. Só existe "Em andamento" e
     * "Próxima" quando o dia selecionado é hoje; nos outros dias todas as
     * aulas ficam com traço. "Próxima" é só a primeira aula que ainda vai
     * começar — as demais futuras também ficam com traço.
     */
    protected readonly statusPorAula = computed(() => {
        const status = new Map<AulaHorario, StatusAula>();
        const aulas = this.itensDoDia().filter((item): item is AulaHorario => item.tipo === 'aula');
        const ehHoje = this.diaSelecionado() === this.hoje;

        const agora = this.relogio.agora();
        const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
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

    ngOnInit(): void { this.horariosService.carregar(); }

    protected selecionarDia(dia: DiaSemana): void {
        this.diaSelecionado.set(dia);
    }

    protected abrirModal(): void {
        this.modalAberto.set(true);
    }

    protected fecharModal(): void {
        this.modalAberto.set(false);
    }

    /** Depois de adicionar, mostra o dia da aula nova para o aluno ver o resultado. */
    protected aulaAdicionada(dia: DiaSemana): void {
        this.diaSelecionado.set(dia);
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
