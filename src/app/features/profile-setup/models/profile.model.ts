import { UsuarioSessao } from '../../../core/services/session.service';
import { Course } from './course.model';

export interface PerfilResponse {
  usuario: UsuarioSessao;
  configuracaoInicialConcluida: boolean;
  cursoId: string | null;
  disciplinasIds: string[];
}

export interface CursoDetalhes extends Course {
  periodos: string[];
  cargaHoraria: number;
  duracaoSemestres: number;
  coordenador: string | null;
}

export interface Disciplina {
  id: string;
  nome: string;
}
