import {
    INTERVALO_MAXIMO_MIN, comIntervalos, ler, nomeProfessor, nomeSala, ordenarTurmas, paraAulaHorario,
    paraDiaSemana, paraHora, paraTurma, quadroAtivo,
} from './mapeadores-backend';
import { AulaHorario, PROFESSOR_A_DEFINIR } from '../models/item-horario';

/** Alocação real do seed do backend (`GET /alocacoes`, contrato atual em camelCase). */
export const ALOCACAO_REAL = {
    id: 1,
    turma: {
        id: 2, codigo: '1/2026', periodo: 1, ano: 2026, numeroAlunos: 40,
        curso: { id: 1, nome: 'Analise e Desenvolvimento de Sistemas', periodicidade: 'Anual', status: 'ATIVO', duracao: 2 },
    },
    disciplina: {
        id: 1, nome: 'Programação Multiplataforma', cargaHoraria: 80, tipoDisciplina: 'Pratica', periodo: 1,
        modalidade: 'Presencial', codDisciplina: 'ISW044', cor: '#2E86AB',
    },
    sala: { id: 1, codigo: 'LAB-01', capacidade: 40, tipoSala: { id: 1, nome: 'Laboratorio' } },
    professor: { id: 1, nome: 'Carlos', email: 'carlos@cps.sp.gov.br', cidade: 'Sorocaba', status: 'ATIVO' },
    diaSemana: 'SEGUNDA',
    blocoHorario: { id: 1, horaInicio: '13:20:00', horaFim: '14:10:00', duracao: 50 },
    quadroHorario: {
        id: 1, versao: 1, status: 'ATIVO',
        periodoAtividadeQuadro: { id: 1, ano: 2026, periodo: 1, dataInicio: '2026-02-02', dataFim: '2026-06-30', status: 'ATIVO' },
    },
};

/** Horário da turma no formato documentado do `/motor-quadro` (branch motor-grade, snake_case, sem professor). */
const HORARIO_MOTOR = {
    dia_semana: 'SEGUNDA',
    bloco_horario: { id: 1, hora_inicio: '13:20:00', hora_fim: '14:10:00' },
    disciplina: { id: 31, nome: 'Projeto Integrador I' },
    sala: { id: 41, codigo: 'LAB INF 02' },
    alocacao_id: 51,
};

function aula(diaSemana: AulaHorario['diaSemana'], inicio: string, termino: string, materia = 'X'): AulaHorario {
    return { tipo: 'aula', diaSemana, inicio, termino, materia, professor: 'P', sala: 'S' };
}

describe('mapeadores do backend (#150)', () => {
    it('lê o campo em camelCase ou em snake_case', () => {
        expect(ler({ numeroAlunos: 40 }, 'numeroAlunos')).toBe(40);
        expect(ler({ numero_alunos: 38 }, 'numeroAlunos')).toBe(38);
        expect(ler(null, 'id')).toBeUndefined();
    });

    it('converte o dia do backend e deixa domingo/valor desconhecido de fora', () => {
        expect(paraDiaSemana('SEGUNDA')).toBe('seg');
        expect(paraDiaSemana('TERÇA')).toBe('ter');
        expect(paraDiaSemana('sabado')).toBe('sab');
        expect(paraDiaSemana('DOMINGO')).toBeNull();
        expect(paraDiaSemana(1)).toBeNull();
    });

    it('corta os segundos do horário e rejeita formato inválido', () => {
        expect(paraHora('13:20:00')).toBe('13:20');
        expect(paraHora('07:05')).toBe('07:05');
        expect(paraHora('25:00:00')).toBeNull();
        expect(paraHora(null)).toBeNull();
    });

    it('converte a alocação real em aula da grade, com sala e professor separados', () => {
        expect(paraAulaHorario(ALOCACAO_REAL)).toEqual({
            tipo: 'aula', diaSemana: 'seg', inicio: '13:20', termino: '14:10',
            materia: 'Programação Multiplataforma', professor: 'Carlos', sala: 'LAB-01',
        });
    });

    it('lê o horário do motor de quadro (snake_case, sem professor) com a mesma função', () => {
        expect(paraAulaHorario(HORARIO_MOTOR)).toEqual({
            tipo: 'aula', diaSemana: 'seg', inicio: '13:20', termino: '14:10',
            materia: 'Projeto Integrador I', professor: PROFESSOR_A_DEFINIR, sala: 'LAB INF 02',
        });
    });

    it('usa os textos padrão quando falta professor ou sala', () => {
        expect(nomeProfessor({ ...ALOCACAO_REAL, professor: null })).toBe(PROFESSOR_A_DEFINIR);
        expect(nomeProfessor({ ...ALOCACAO_REAL, professor: { nome: '  ' } })).toBe(PROFESSOR_A_DEFINIR);
        expect(nomeSala({ ...ALOCACAO_REAL, sala: null })).toBe('A definir');
    });

    it('descarta alocação sem dado essencial, em domingo ou com bloco invertido (ex.: 17:00–17:00 do seed)', () => {
        expect(paraAulaHorario({ ...ALOCACAO_REAL, disciplina: null })).toBeNull();
        expect(paraAulaHorario({ ...ALOCACAO_REAL, diaSemana: 'DOMINGO' })).toBeNull();
        expect(paraAulaHorario({ ...ALOCACAO_REAL, blocoHorario: { horaInicio: '17:00:00', horaFim: '17:00:00' } })).toBeNull();
    });

    it('mantém só alocações de quadro e período ativos', () => {
        expect(quadroAtivo(ALOCACAO_REAL)).toBeTrue();
        expect(quadroAtivo({ ...ALOCACAO_REAL, quadroHorario: { ...ALOCACAO_REAL.quadroHorario, status: 'INATIVO' } })).toBeFalse();
        expect(quadroAtivo({ ...ALOCACAO_REAL, quadroHorario: {
            ...ALOCACAO_REAL.quadroHorario, periodoAtividadeQuadro: { status: 'INATIVO' },
        } })).toBeFalse();
        expect(quadroAtivo(HORARIO_MOTOR)).toBeTrue();
    });

    it('converte a turma real e a do contrato snake_case', () => {
        expect(paraTurma(ALOCACAO_REAL.turma)).toEqual({
            id: 2, codigo: '1/2026', periodo: 1, ano: 2026, numeroAlunos: 40,
            cursoId: 1, cursoNome: 'Analise e Desenvolvimento de Sistemas',
        });
        expect(paraTurma({ id: 10, codigo: '4º ANO', periodo: 1, ano: 2026, numero_alunos: 35, curso: { id: 1, nome: 'AMS' } }))
            .toEqual({ id: 10, codigo: '4º ANO', periodo: 1, ano: 2026, numeroAlunos: 35, cursoId: 1, cursoNome: 'AMS' });
        expect(paraTurma({ id: 3, codigo: '', periodo: 1, ano: 2026 })).toBeNull();
    });

    it('ordena turmas por ano, período e código', () => {
        const base = paraTurma(ALOCACAO_REAL.turma)!;
        const ordem = ordenarTurmas([
            { ...base, id: 3, ano: 2027, periodo: 1, codigo: '1/2027' },
            { ...base, id: 2, ano: 2026, periodo: 2, codigo: '2/2026-ADS' },
            { ...base, id: 1, ano: 2026, periodo: 1, codigo: '1/2026' },
        ]).map(t => t.id);
        expect(ordem).toEqual([1, 2, 3]);
    });

    it(`ordena por dia e horário e só cria intervalo para lacunas de até ${INTERVALO_MAXIMO_MIN} min`, () => {
        const itens = comIntervalos([
            aula('ter', '13:20', '14:10'),
            aula('seg', '15:10', '16:00', 'B'),
            aula('seg', '13:20', '14:10', 'A'),
            aula('seg', '14:10', '15:00', 'A'),
            aula('seg', '18:50', '19:40', 'C'),
        ]);
        expect(itens.map(i => `${i.diaSemana} ${i.tipo} ${i.inicio}-${i.termino}`)).toEqual([
            'seg aula 13:20-14:10',
            'seg aula 14:10-15:00',
            'seg intervalo 15:00-15:10',
            'seg aula 15:10-16:00',
            'seg aula 18:50-19:40',
            'ter aula 13:20-14:10',
        ]);
    });
});
