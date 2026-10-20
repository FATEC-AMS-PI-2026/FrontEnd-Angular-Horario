import { ProfessorApi } from '../models/professor-api';

/** Fixtures de contrato: estrutura do seed Java, com vigência controlada para os testes. */
export const professorApi = (id = 1, nome = 'Ana'): ProfessorApi => ({
    id, nome, email: `docente${id}@example.test`, cidade: null, status: 'ATIVO',
});

export const alocacaoApi = (id = 1, professorId = 1, cursoId = 1, cursoNome = 'ADS') => ({
    id, professor: professorApi(professorId),
    turma: { id: 2, codigo: '1/2026', ano: 2026, periodo: 1,
        curso: { id: cursoId, nome: cursoNome, status: 'ATIVO' } },
    disciplina: { id: 1, nome: 'Programação Multiplataforma' },
    sala: { id: 1, codigo: 'LAB-01', tipo_sala: { id: 1, nome: 'Laboratório' } },
    dia_semana: 'TERÇA',
    bloco_horario: { hora_inicio: '13:20:00', hora_fim: '14:10:00' },
    quadro_horario: { id: 1, status: 'ATIVO',
        periodo_atividade_quadro: { status: 'ATIVO', data_inicio: '2026-08-01', data_fim: '2026-12-20' } },
});

export const paginaApi = (content: unknown[], page = 0, total_pages = content.length ? 1 : 0) =>
    ({ content, page, total_pages, total_elements: content.length });
