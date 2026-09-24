import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RelogioService } from '../salas/services/relogio';
import { HorariosService } from './services/horarios';
import { AulaHorario, DiaSemana, ItemHorario } from './models/item-horario';

/** Status exibido na coluna "Status": badge verde, badge cinza ou traço. */
export type StatusAula = 'em-andamento' | 'proxima' | 'nenhum';

/** Minutos desde 00:00 de um horário `HH:mm`, para comparar/ordenar. */
function paraMinutos(horario: string): number {
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
}

/** Chips na ordem da semana. Índice de `Date.getDay()` em `DIA_POR_GETDAY`. */
const DIAS: { valor: DiaSemana; rotulo: string; nome: string }[] = [
    { valor: 'seg', rotulo: 'Seg', nome: 'Segunda-feira' },
    { valor: 'ter', rotulo: 'Ter', nome: 'Terça-feira' },
    { valor: 'qua', rotulo: 'Qua', nome: 'Quarta-feira' },
    { valor: 'qui', rotulo: 'Qui', nome: 'Quinta-feira' },
    { valor: 'sex', rotulo: 'Sex', nome: 'Sexta-feira' },
    { valor: 'sab', rotulo: 'Sáb', nome: 'Sábado' },
];

/** `Date.getDay()` (0 = domingo) → dia da grade. Domingo não tem chip. */
const DIA_POR_GETDAY: (DiaSemana | null)[] = [null, 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

/**
 * Página "Horários" (issue #103): chips de Seg a Sáb para escolher o dia e
 * uma tabela com a grade desse dia em ordem cronológica, com intervalos
 * como linhas separadoras e status dinâmico ("Em andamento" / "Próxima")
 * calculado a partir do horário atual.
 */
@Component({
    selector: 'app-horarios',
    standalone: true,
    templateUrl: './horarios.html',
    styleUrl: './horarios.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Horarios {
    private readonly horariosService = inject(HorariosService);
    private readonly relogio = inject(RelogioService);

    protected readonly dias = DIAS;

    /** Dia de hoje na grade, ou `null` no domingo. */
    private readonly hoje = DIA_POR_GETDAY[this.relogio.agora().getDay()];

    /** Dia selecionado nos chips. Abre no dia de hoje (segunda, se for domingo). */
    protected readonly diaSelecionado = signal<DiaSemana>(this.hoje ?? 'seg');

    protected readonly nomeDiaSelecionado = computed(
        () => DIAS.find((dia) => dia.valor === this.diaSelecionado())?.nome ?? '',
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

    protected selecionarDia(dia: DiaSemana): void {
        this.diaSelecionado.set(dia);
    }

    protected statusDe(aula: AulaHorario): StatusAula {
        return this.statusPorAula().get(aula) ?? 'nenhum';
    }

    /** Type guard usado no template para diferenciar aula de intervalo no `@if`. */
    protected ehAula(item: ItemHorario): item is AulaHorario {
        return item.tipo === 'aula';
    }
}
