import { UsuarioSessao } from '../../../core/services/session.service';
import { Course } from './course.model';

/** Modelo consumido pelas telas. Não é um DTO confirmado do Java.
 * TEMPORÁRIO: excluir a convenção local de IDs de ofertas (disciplina + turma) após integrar o backend Java.
 * O adaptador remoto deverá mapear explicitamente os identificadores do servidor.
 */
export interface PerfilResponse {
    usuario: UsuarioSessao;
    configuracaoInicialConcluida: boolean;
    cursoId: string | null;
    disciplinasIds: string[];
}

export interface CursoDetalhes extends Course {
    periodos: string[];
    cargaHoraria: number | null;
    duracaoAnos?: number;
    duracaoSemestres: number;
    coordenador: string | null;
}

export interface Disciplina {
    id: string;
    nome: string;
    /** Período de origem na matriz do curso, conforme CursoDetalhes.periodos. */
    periodo: string;
}
