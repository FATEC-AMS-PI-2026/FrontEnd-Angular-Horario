import { CorMateria } from '../../../shared/utils/cores-materia';

/** Modelos de apresentação, separados dos DTOs Java. */
export type CargoProfessor = 'Professor' | 'Coordenador do Curso';
export type IdProfessor = number | `local-${number}`;
export type IdCursoProfessor = number | `local-${number}`;

export interface Professor {
    id: IdProfessor;
    nome: string;
    /** Cargo/coordenação ainda não é informado no cadastro Java. */
    cargo: CargoProfessor | null;
    /** TEMPORÁRIO: correspondência com o catálogo do navegador, sem equiparar IDs Java. */
    idLocal?: number;
}

/** Curso encontrado na agenda, não um vínculo institucional completo. */
export interface CursoProfessor { id: IdCursoProfessor; nome: string; }

export interface AulaProfessor {
    id: number | `local-${number}`;
    professorId: IdProfessor;
    diaSemana: string;
    inicio: string;
    termino: string;
    disciplina: string;
    turma: string;
    local: string;
    curso: CursoProfessor;
    cor: CorMateria;
}

export type ItemProfessor = { tipo: 'aula'; aula: AulaProfessor } | { tipo: 'intervalo' };
export interface DiaProfessor { diaSemana: string; itens: ItemProfessor[]; }
