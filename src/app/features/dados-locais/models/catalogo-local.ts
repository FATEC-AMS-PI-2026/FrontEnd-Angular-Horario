/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend Java.
 * Implementação exclusiva do armazenamento acadêmico e das contas locais no navegador.
 */
import { DiaSemana } from '../../dashboard/models/grade-dia.model';

export interface CursoLocal {
    organizacao: 'Anual' | 'Semestral';
    id: number; nome: string; turno: 'Manhã' | 'Tarde' | 'Noite'; unidade: string;
    periodos: number[]; cargaHoraria: number | null; duracaoSemestres: number; coordenador: string | null;
}
export interface CatalogoLocal {
    versao: 1;
    titulo: string;
    atualizadoEm: string;
    vigenciaInicio: string | null;
    vigenciaFim: string | null;
    calendario?: {
        semAula: { inicio: string; fim: string; motivo: string }[];
        reposicoes: { data: string; diaSemana: DiaSemana; turno: string }[];
    };
    quadroHorario: { id: number; versao: number };
    cursos: CursoLocal[];
    disciplinas: { id: number; nome: string; periodo: number; cursoId: number }[];
    professores: { id: number; nome: string }[];
    salas: { id: number; codigo: string }[];
    turmas: { id: number; codigo: string; periodo: number; ano: number; cursoId: number; turno: string }[];
    ofertas: { id: number; disciplinaId: number; turmaId: number }[];
    alocacoes: {
        id: number; ofertaId: number; professorId: number | null; salaId: number | null;
        diaSemana: DiaSemana; horaInicio: string; horaFim: string;
    }[];
}
export interface PerfilLocal {
    id: string; nome: string; cursoId: number | null; periodo: number | null;
    ofertasIds: number[]; revisao: string | null;
}
export interface CatalogoSalvo { catalogo: CatalogoLocal; revisao: string; importadoEm: string; }
export class DadosLocaisError extends Error { }
