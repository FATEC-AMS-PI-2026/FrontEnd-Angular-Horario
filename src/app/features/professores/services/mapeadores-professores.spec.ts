import { agruparAulasProfessor, paraAulaProfessor, paraProfessor } from './mapeadores-professores';
import { alocacaoApi, professorApi } from '../testing/professores-api.fixture';

describe('Mapeadores de professores Java', () => {
    const hoje = '2026-10-13';

    it('não inventa cargo a partir do cadastro, status ou papel', () => {
        expect(paraProfessor({ ...professorApi(), papel: 'COORDENADOR' }))
            .toEqual({ id: 1, nome: 'Ana', cargo: null });
        expect(() => paraProfessor({ ...professorApi(), nome: ' ' })).toThrow();
        expect(() => paraProfessor({ ...professorApi(), id: 0 })).toThrow();
        expect(() => paraProfessor({ id: 1, nome: 'Ana' })).toThrow();
    });

    it('mapeia o JSON snake_case atual, preserva turma e aplica só localização confirmada', () => {
        expect(paraAulaProfessor(alocacaoApi(), hoje, 1)).toEqual({
            id: 1, professorId: 1, diaSemana: 'Terça-feira', inicio: '13:20', termino: '14:10',
            disciplina: 'Programação Multiplataforma', turma: '1/2026',
            local: 'LAB-01 – Prédio 1', curso: { id: 1, nome: 'ADS' }, cor: 'verde',
        });
    });

    it('também lê camelCase e não perde alocações de domingo', () => {
        const a = alocacaoApi();
        const camel = { ...a, dia_semana: undefined, bloco_horario: undefined, quadro_horario: undefined,
            diaSemana: 'DOMINGO', blocoHorario: { horaInicio: '08:00', horaFim: '09:00' },
            quadroHorario: { status: 'ATIVO', periodoAtividadeQuadro: {
                status: 'ATIVO', dataInicio: '2026-08-01', dataFim: '2026-12-20' } } };
        expect(paraAulaProfessor(camel, hoje, 1)?.diaSemana).toBe('Domingo');
        expect(paraAulaProfessor(camel, hoje, 1)?.inicio).toBe('08:00');
    });

    it('oculta andar e mantém Auditório separado mesmo com tipo genérico Sala', () => {
        const a = alocacaoApi();
        expect(paraAulaProfessor({ ...a, sala: { id: 3, codigo: 'AUD-01', tipo_sala: { nome: 'Sala' } } }, hoje)?.local)
            .toBe('AUD-01');
        expect(paraAulaProfessor({ ...a, sala: null }, hoje)?.local).toBe('');
    });

    it('rejeita resposta de outro docente mesmo quando a alocação está vencida', () => {
        expect(() => paraAulaProfessor(alocacaoApi(1, 2), hoje, 1)).toThrow();
        expect(() => paraAulaProfessor({ ...alocacaoApi(), professor: null }, hoje, 1)).toThrow();
        expect(paraAulaProfessor({ ...alocacaoApi(), professor: null }, hoje)).toBeNull();
    });

    it('descarta quadros inativos, vencidos ou futuros e recusa vigência ausente/inválida', () => {
        const a = alocacaoApi(), q = a.quadro_horario, p = q.periodo_atividade_quadro;
        expect(paraAulaProfessor({ ...a, quadro_horario: { ...q, status: 'INATIVO' } }, hoje)).toBeNull();
        for (const datas of [{ data_fim: '2026-10-12' }, { data_inicio: '2026-10-14' }]) {
            expect(paraAulaProfessor({ ...a, quadro_horario: { ...q, periodo_atividade_quadro: { ...p, ...datas } } }, hoje)).toBeNull();
        }
        expect(() => paraAulaProfessor({ ...a, quadro_horario: { status: 'ATIVO' } }, hoje)).toThrow();
        expect(() => paraAulaProfessor({ ...a, quadro_horario: { ...q,
            periodo_atividade_quadro: { ...p, data_inicio: '2026-02-30' } } }, hoje)).toThrow();
    });

    it('recusa horários e cursos incoerentes sem transformar dados inválidos em agenda vazia', () => {
        const a = alocacaoApi();
        expect(() => paraAulaProfessor({ ...a, bloco_horario: { hora_inicio: '25:00', hora_fim: '26:00' } }, hoje)).toThrow();
        expect(() => paraAulaProfessor({ ...a, dia_semana: 'FERIADO' }, hoje)).toThrow();
        expect(() => paraAulaProfessor({ ...a, quadro_horario: { ...a.quadro_horario,
            curso: { id: 8, nome: 'Outro', status: 'ATIVO' } } }, hoje)).toThrow();
        const semCursoNaTurma = { ...a, turma: { ...a.turma, curso: undefined }, quadro_horario: {
            ...a.quadro_horario, curso: a.turma.curso } };
        expect(paraAulaProfessor(semCursoNaTurma, hoje)?.curso.id).toBe(1);
    });

    it('ordena dias/horários e calcula lacunas pela maior ocupação, incluindo sobreposições', () => {
        const a = paraAulaProfessor(alocacaoApi(), hoje)!;
        const aulas = [
            { ...a, id: 4, inicio: '16:10', termino: '17:00' },
            { ...a, id: 1, inicio: '13:00', termino: '16:00' },
            { ...a, id: 2, inicio: '14:00', termino: '14:30' },
            { ...a, id: 3, inicio: '15:00', termino: '15:30' },
            { ...a, id: 5, diaSemana: 'Segunda-feira' },
        ];
        const dias = agruparAulasProfessor(aulas);
        expect(dias.map(d => d.diaSemana)).toEqual(['Segunda-feira', 'Terça-feira']);
        expect(dias[1].itens.map(i => i.tipo)).toEqual(['aula', 'aula', 'aula', 'intervalo', 'aula']);
    });
});
