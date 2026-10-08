import { AulaHorario, DiaSemana, IntervaloHorario, ItemHorario, PROFESSOR_A_DEFINIR } from '../models/item-horario';
import { Turma } from '../models/turma';

/**
 * Ponto único de tradução do formato do backend Java para os modelos das telas
 * (#150). O `/alocacoes` devolve turma, disciplina, sala, professor, dia e bloco
 * misturados num registro só; aqui cada informação sai por uma função própria.
 *
 * Os campos são lidos em camelCase (contrato atual da `dev`) ou snake_case
 * (branch `enhancement/motor-grade`, que liga o SNAKE_CASE global no Jackson),
 * para que a troca de contrato no backend mexa só neste arquivo.
 */

/** Registro cru vindo do backend. */
export type RegistroApi = Record<string, unknown>;

/** Lacuna máxima entre duas aulas seguidas para virar "Intervalo"; acima disso é troca de turno. */
export const INTERVALO_MAXIMO_MIN = 30;

const DIAS_BACKEND: Record<string, DiaSemana> = {
    SEGUNDA: 'seg', TERCA: 'ter', QUARTA: 'qua', QUINTA: 'qui', SEXTA: 'sex', SABADO: 'sab',
};

function paraSnake(campo: string): string {
    return campo.replace(/[A-Z]/g, letra => '_' + letra.toLowerCase());
}

/** Lê `campo` em camelCase ou, se ausente, na versão snake_case. */
export function ler(registro: unknown, campo: string): unknown {
    if (!registro || typeof registro !== 'object') return undefined;
    const r = registro as RegistroApi;
    return r[campo] !== undefined ? r[campo] : r[paraSnake(campo)];
}

function texto(registro: unknown, campo: string): string | null {
    const valor = ler(registro, campo);
    return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function numero(registro: unknown, campo: string): number | null {
    const valor = ler(registro, campo);
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** "SEGUNDA" → "seg". Domingo e valores desconhecidos ficam de fora da grade (null). */
export function paraDiaSemana(valor: unknown): DiaSemana | null {
    if (typeof valor !== 'string') return null;
    const chave = valor.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
    return DIAS_BACKEND[chave] ?? null;
}

/** "13:20:00" → "13:20". Retorna null para horário inválido. */
export function paraHora(valor: unknown): string | null {
    if (typeof valor !== 'string') return null;
    const partes = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(valor.trim());
    if (!partes || Number(partes[1]) > 23 || Number(partes[2]) > 59 ||
        (partes[3] !== undefined && Number(partes[3]) > 59)) return null;
    return `${partes[1]}:${partes[2]}`;
}

export function nomeDisciplina(registro: unknown): string | null {
    return texto(ler(registro, 'disciplina'), 'nome');
}

/** Código da sala (ex.: "LAB-01"); sem sala alocada, "A definir". */
export function nomeSala(registro: unknown): string {
    return texto(ler(registro, 'sala'), 'codigo') ?? 'A definir';
}

/** No backend o professor é só informativo e pode faltar (o `/motor-quadro` nem o envia). */
export function nomeProfessor(registro: unknown): string {
    return texto(ler(registro, 'professor'), 'nome') ?? PROFESSOR_A_DEFINIR;
}

/**
 * Converte uma alocação (`/alocacoes`) ou um horário do motor de quadro
 * (`/motor-quadro/cursos/{id}/turmas/{id}`) numa aula da grade. Retorna null
 * quando falta dado essencial (dia, horário ou disciplina) ou o dia é domingo.
 */
export function paraAulaHorario(registro: unknown): AulaHorario | null {
    const diaSemana = paraDiaSemana(ler(registro, 'diaSemana'));
    const bloco = ler(registro, 'blocoHorario');
    const inicio = paraHora(ler(bloco, 'horaInicio'));
    const termino = paraHora(ler(bloco, 'horaFim'));
    const materia = nomeDisciplina(registro);
    if (!diaSemana || !inicio || !termino || inicio >= termino || !materia) return null;
    return {
        tipo: 'aula', diaSemana, inicio, termino, materia,
        professor: nomeProfessor(registro),
        sala: nomeSala(registro),
    };
}

/** Só entram aulas de quadro horário ativo; sem a informação de status, a alocação é mantida. */
export function quadroAtivo(registro: unknown): boolean {
    const quadro = ler(registro, 'quadroHorario');
    const status = texto(quadro, 'status');
    const statusPeriodo = texto(ler(quadro, 'periodoAtividadeQuadro'), 'status');
    return (!status || status === 'ATIVO') && (!statusPeriodo || statusPeriodo === 'ATIVO');
}

export function paraTurma(registro: unknown): Turma | null {
    const id = numero(registro, 'id');
    const codigo = texto(registro, 'codigo');
    const periodo = numero(registro, 'periodo');
    const ano = numero(registro, 'ano');
    if (id === null || !Number.isSafeInteger(id) || id <= 0 || !codigo ||
        periodo === null || !Number.isSafeInteger(periodo) || periodo <= 0 ||
        ano === null || !Number.isSafeInteger(ano) || ano <= 0) return null;
    const curso = ler(registro, 'curso');
    const statusCurso = texto(curso, 'status');
    if (statusCurso && statusCurso !== 'ATIVO') return null;
    const numeroAlunos = numero(registro, 'numeroAlunos');
    if (numeroAlunos !== null && (!Number.isSafeInteger(numeroAlunos) || numeroAlunos < 0)) return null;
    return {
        id, codigo, periodo, ano,
        numeroAlunos,
        cursoId: numero(curso, 'id'),
        cursoNome: texto(curso, 'nome'),
    };
}

/**
 * Turmas de um curso deduzidas das alocações. Plano B para quando `/turmas`
 * falha: no PostgreSQL o filtro de texto vazio do backend dá 500
 * (`lower(bytea)`), enquanto `/alocacoes` funciona. Só aparecem turmas com
 * pelo menos uma aula alocada.
 */
export function turmasDasAlocacoes(
    alocacoes: unknown[], cursoId: number, filtro: { ano?: number; periodo?: number } = {},
): Turma[] {
    const porId = new Map<number, Turma>();
    for (const alocacao of alocacoes) {
        if (!quadroAtivo(alocacao)) continue;
        const turma = paraTurma(ler(alocacao, 'turma'));
        if (!turma || porId.has(turma.id)) continue;
        // A turma da alocação às vezes vem sem curso; nesse caso vale o curso do quadro horário.
        const curso = turma.cursoId ?? numero(ler(ler(alocacao, 'quadroHorario'), 'curso'), 'id');
        if (curso !== cursoId) continue;
        if (filtro.ano !== undefined && turma.ano !== filtro.ano) continue;
        if (filtro.periodo !== undefined && turma.periodo !== filtro.periodo) continue;
        porId.set(turma.id, { ...turma, cursoId: curso });
    }
    return ordenarTurmas([...porId.values()]);
}

export function ordenarTurmas(turmas: Turma[]): Turma[] {
    return [...turmas].sort((a, b) => a.ano - b.ano || a.periodo - b.periodo ||
        a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }));
}

function minutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Ordena as aulas por dia e horário e insere um "Intervalo" entre aulas seguidas
 * do mesmo dia separadas por até {@link INTERVALO_MAXIMO_MIN} minutos.
 */
export function comIntervalos(aulas: AulaHorario[]): ItemHorario[] {
    const ordemDia: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const ordenadas = [...aulas].sort((a, b) =>
        ordemDia.indexOf(a.diaSemana) - ordemDia.indexOf(b.diaSemana) || a.inicio.localeCompare(b.inicio));
    const itens: ItemHorario[] = [];
    let anterior: AulaHorario | undefined;
    ordenadas.forEach(aula => {
        if (anterior?.diaSemana === aula.diaSemana) {
            const lacuna = minutos(aula.inicio) - minutos(anterior.termino);
            if (lacuna > 0 && lacuna <= INTERVALO_MAXIMO_MIN) {
                const intervalo: IntervaloHorario = {
                    tipo: 'intervalo', diaSemana: aula.diaSemana, inicio: anterior.termino, termino: aula.inicio,
                };
                itens.push(intervalo);
            }
        }
        itens.push(aula);
        // A aula que termina mais tarde delimita a ocupação, mesmo com sobreposição.
        if (!anterior || anterior.diaSemana !== aula.diaSemana || aula.termino > anterior.termino) {
            anterior = aula;
        }
    });
    return itens;
}
