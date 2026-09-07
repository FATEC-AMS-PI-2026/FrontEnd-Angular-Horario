import { Component, computed, inject, signal } from '@angular/core';
import { ProfessoresService } from './services/professores';
import { AulaProfessor, CargoProfessor, Professor } from './models/professor';

/** Item de exibição dentro do agrupamento por dia: uma aula ou um intervalo. */
type ItemDoDia = { tipo: 'aula'; aula: AulaProfessor } | { tipo: 'intervalo' };

/** Um dia da semana com seus itens (aulas e intervalos) já intercalados. */
interface DiaAgrupado {
    diaSemana: string;
    itens: ItemDoDia[];
}

/** Minutos desde 00:00 de um horário `HH:mm`, para comparar/ordenar. */
function paraMinutos(horario: string): number {
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
}

/**
 * Ordem de referência dos dias da semana, usada para ordenar os
 * agrupamentos de forma previsível (a ordem de cadastro das aulas no mock
 * não necessariamente segue a ordem cronológica da semana).
 */
const ORDEM_DIAS = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
];

/**
 * Página "Professores": busca e filtra professores por cargo e curso,
 * exibe um card por professor (com destaque para o selecionado) e, abaixo,
 * as aulas da semana do professor selecionado agrupadas por dia — com
 * intervalos exibidos sempre que há um intervalo de tempo entre duas aulas
 * consecutivas do mesmo dia.
 */
@Component({
    selector: 'app-professores',
    standalone: true,
    imports: [],
    templateUrl: './professores.html',
    styleUrl: './professores.scss',
})
export class Professores {
    private readonly professoresService = inject(ProfessoresService);
    protected readonly professores = this.professoresService.professores;

    /** Termo digitado no campo de busca (nome do professor). */
    protected readonly termoBusca = signal('');

    /** Cargo selecionado no filtro. `null` significa "todos os cargos". */
    protected readonly cargoSelecionado = signal<CargoProfessor | null>(null);

    /** Curso selecionado nos chips. `null` significa "todos os cursos". */
    protected readonly cursoSelecionado = signal<string | null>(null);

    /** Id do professor selecionado no momento (destaque verde no card). */
    private readonly professorSelecionadoId = signal<number | null>(1);

    /** Lista de cursos distintos, na ordem em que aparecem no cadastro, para os chips. */
    protected readonly cursos = computed(() => {
        const vistos = new Set<string>();
        for (const professor of this.professores()) {
            vistos.add(professor.curso);
        }
        return Array.from(vistos);
    });

    /** Lista de cargos distintos, para popular o filtro "Todos os cargos". */
    protected readonly cargos = computed(() => {
        const vistos = new Set<CargoProfessor>();
        for (const professor of this.professores()) {
            vistos.add(professor.cargo);
        }
        return Array.from(vistos);
    });

    /** Professores já filtrados por curso, cargo e termo de busca. */
    protected readonly professoresFiltrados = computed(() => {
        const curso = this.cursoSelecionado();
        const cargo = this.cargoSelecionado();
        const termo = this.termoBusca().trim().toLowerCase();
        let professores = this.professores();

        if (curso) {
            professores = professores.filter((professor) => professor.curso === curso);
        }

        if (cargo) {
            professores = professores.filter((professor) => professor.cargo === cargo);
        }

        if (termo) {
            professores = professores.filter((professor) => professor.nome.toLowerCase().includes(termo));
        }

        return professores;
    });

    /**
     * Professor selecionado. Se o selecionado atual não estiver mais na lista
     * filtrada (curso/cargo/busca mudou), cai para o primeiro da lista —
     * assim sempre há um professor em destaque quando a lista não está vazia.
     */
    protected readonly professorSelecionado = computed<Professor | null>(() => {
        const lista = this.professoresFiltrados();
        if (lista.length === 0) {
            return null;
        }
        return lista.find((professor) => professor.id === this.professorSelecionadoId()) ?? lista[0];
    });

    /** Aulas do professor selecionado, agrupadas por dia e com intervalos intercalados. */
    protected readonly diasAgrupados = computed<DiaAgrupado[]>(() => {
        const professor = this.professorSelecionado();
        if (!professor) {
            return [];
        }

        const porDia = new Map<string, AulaProfessor[]>();
        for (const aula of professor.aulas) {
            const aulasDoDia = porDia.get(aula.diaSemana) ?? [];
            aulasDoDia.push(aula);
            porDia.set(aula.diaSemana, aulasDoDia);
        }

        const dias = Array.from(porDia.keys()).sort(
            (a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b),
        );

        return dias.map((diaSemana) => {
            const aulasOrdenadas = [...(porDia.get(diaSemana) ?? [])].sort(
                (a, b) => paraMinutos(a.inicio) - paraMinutos(b.inicio),
            );

            const itens: ItemDoDia[] = [];
            aulasOrdenadas.forEach((aula, indice) => {
                if (indice > 0) {
                    const anterior = aulasOrdenadas[indice - 1];
                    if (paraMinutos(aula.inicio) > paraMinutos(anterior.termino)) {
                        itens.push({ tipo: 'intervalo' });
                    }
                }
                itens.push({ tipo: 'aula', aula });
            });

            return { diaSemana, itens };
        });
    });

    /** Mensagem exibida quando a combinação de filtros não encontra nenhum professor. */
    protected readonly mensagemVazia = computed(() => {
        const termo = this.termoBusca().trim();
        return termo
            ? `Nenhum professor encontrado para "${termo}".`
            : 'Nenhum professor encontrado para os filtros selecionados.';
    });

    protected onBuscar(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.termoBusca.set(input.value);
    }

    protected onFiltrarCargo(event: Event): void {
        const select = event.target as HTMLSelectElement;
        this.cargoSelecionado.set((select.value || null) as CargoProfessor | null);
    }

    protected selecionarCurso(curso: string | null): void {
        this.cursoSelecionado.update((atual) => (atual === curso ? null : curso));
    }

    protected selecionarProfessor(professor: Professor): void {
        this.professorSelecionadoId.set(professor.id);
    }

    protected estaSelecionado(professor: Professor): boolean {
        return this.professorSelecionado()?.id === professor.id;
    }

    /** Type guard usado no template para diferenciar aula de intervalo no `@if`. */
    protected ehAula(item: ItemDoDia): item is { tipo: 'aula'; aula: AulaProfessor } {
        return item.tipo === 'aula';
    }

    /** Iniciais do nome do professor, exibidas no avatar do card (ex.: "Glauco Todesco" -> "GT"). */
    protected iniciais(nome: string): string {
        return nome
            .trim()
            .split(/\s+/)
            .map((parte) => parte[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
}
