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
    /** Período letivo vigente segundo o servidor (ex.: quadro de horários ativo). null = não informado. */
    periodoLetivoAtual?: string | null;
    /** Último período letivo em que o aluno confirmou ano/semestre e disciplinas. */
    periodoLetivoConfirmado?: string | null;
}

/** O onboarding só volta sozinho quando o servidor informa um período letivo ainda não confirmado. */
export function periodoLetivoPendente(perfil: PerfilResponse | null): boolean {
    if (!perfil?.configuracaoInicialConcluida) return true;
    const atual = perfil.periodoLetivoAtual ?? null;
    return atual !== null && perfil.periodoLetivoConfirmado !== atual;
}

export type PeriodicidadeCurso = 'Anual' | 'Semestral';

export function rotuloPeriodo(numero: number, periodicidade: PeriodicidadeCurso): string {
    return `${numero}º ${periodicidade === 'Anual' ? 'ano' : 'semestre'}`;
}

export interface CursoDetalhes extends Course {
    periodicidade: PeriodicidadeCurso;
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
