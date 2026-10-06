import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HorariosService } from '../horarios/services/horarios';
import { AulaHorario, DiaSemana } from '../horarios/models/item-horario';
import { atribuirCores, CorMateria, embaralhar, PALETA_MATERIAS } from '../../shared/utils/cores-materia';

/** Texto do card quando a aula ainda não tem professor atribuído (#114). */
export const PROFESSOR_A_DEFINIR = 'Professor a definir';

/** Uma linha da grade: um horário com a aula de cada dia, ou um intervalo. */
interface LinhaGrade {
    inicio: string;
    termino: string;
    intervalo: boolean;
    /** Uma posição por coluna de `dias()`; `null` quando não há aula nesse dia/horário. */
    celulas: (AulaHorario | null)[];
}

const DIAS_UTEIS: { valor: DiaSemana; nome: string }[] = [
    { valor: 'seg', nome: 'Segunda' },
    { valor: 'ter', nome: 'Terça' },
    { valor: 'qua', nome: 'Quarta' },
    { valor: 'qui', nome: 'Quinta' },
    { valor: 'sex', nome: 'Sexta' },
];
const SABADO = { valor: 'sab' as DiaSemana, nome: 'Sábado' };

/**
 * Página "Grade Semanal": matriz horário × dia montada a partir do
 * `HorariosService` (a mesma fonte da tela de Horários), em vez de uma
 * matriz fixa no componente. Cada card mostra matéria e professor (#114)
 * e recebe uma cor sorteada a cada carregamento da tela (#115).
 */
@Component({
    selector: 'app-grade-semanal',
    standalone: true,
    templateUrl: './grade-semanal.html',
    styleUrl: './grade-semanal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeSemanal {
    private readonly horariosService = inject(HorariosService);

    /** Sorteada uma vez por carregamento: a cor muda ao recarregar, mas não a cada interação. */
    private readonly paleta = embaralhar(PALETA_MATERIAS);

    private readonly aulas = computed(() =>
        this.horariosService.itens().filter((item): item is AulaHorario => item.tipo === 'aula'),
    );

    /** Segunda a sexta; sábado só aparece quando há aula nele. */
    protected readonly dias = computed(() =>
        this.aulas().some((aula) => aula.diaSemana === 'sab') ? [...DIAS_UTEIS, SABADO] : DIAS_UTEIS,
    );

    protected readonly linhas = computed<LinhaGrade[]>(() => {
        const itens = this.horariosService.itens();
        const dias = this.dias();
        const terminoPorInicio = new Map<string, string>();
        for (const item of itens) {
            terminoPorInicio.set(item.inicio, item.termino);
        }

        return [...terminoPorInicio.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([inicio, termino]) => {
                const celulas = dias.map(
                    (dia) => this.aulas().find((aula) => aula.diaSemana === dia.valor && aula.inicio === inicio) ?? null,
                );
                const intervalo = celulas.every((celula) => celula === null)
                    && itens.some((item) => item.tipo === 'intervalo' && item.inicio === inicio);
                return { inicio, termino, intervalo, celulas };
            });
    });

    private readonly cores = computed(() =>
        atribuirCores(this.aulas().map((aula) => aula.materia), this.paleta),
    );

    protected corDe(aula: AulaHorario): CorMateria {
        return this.cores().get(aula.materia) ?? this.paleta[0];
    }

    protected professorDe(aula: AulaHorario): string {
        return aula.professor?.trim() || PROFESSOR_A_DEFINIR;
    }

    protected temProfessor(aula: AulaHorario): boolean {
        return !!aula.professor?.trim();
    }
}
