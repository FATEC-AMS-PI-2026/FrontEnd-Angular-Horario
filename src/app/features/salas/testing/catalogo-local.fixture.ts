// TEMPORÁRIO: fixture exclusiva dos testes do adaptador de armazenamento interno.
import { CatalogoLocal } from '../../dados-locais/models/catalogo-local';

export function catalogoSalaLocal(): CatalogoLocal {
  return {
    versao: 1, titulo: 'Teste', atualizadoEm: '2026-10-01',
    vigenciaInicio: '2026-08-01', vigenciaFim: '2026-12-20', quadroHorario: { id: 1, versao: 1 },
    cursos: [{ id: 1, nome: 'Curso de teste', organizacao: 'Anual', turno: 'Tarde', unidade: 'Unidade de teste',
      periodos: [1], cargaHoraria: null, duracaoSemestres: 2, coordenador: null }],
    salas: [{ id: 90, codigo: 'LAB 01' }], professores: [{ id: 1, nome: 'Docente local' }],
    disciplinas: [{ id: 1, nome: 'Disciplina local', periodo: 1, cursoId: 1 }],
    ofertas: [{ id: 1, disciplinaId: 1, turmaId: 1 }],
    turmas: [{ id: 1, codigo: 'Turma local', periodo: 1, ano: 2026, cursoId: 1, turno: 'Tarde' }],
    alocacoes: [{ id: 1, ofertaId: 1, professorId: 1, salaId: 90, diaSemana: 'SEGUNDA', horaInicio: '13:00', horaFim: '14:00' }],
  };
}
