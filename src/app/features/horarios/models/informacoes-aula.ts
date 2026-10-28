import { referenciaAcademica } from '../../../shared/models/referencia-academica';
import { AlocacaoResponse } from '../../dashboard/models/grade-dia.model';
import { AulaHorario } from './item-horario';

/** Campos usados pelo mesmo modal na Grade Semanal e na Dashboard. */
export type InformacoesAula = Pick<AulaHorario, 'materia' | 'professor' | 'sala' | 'referencias'>;

/** Projeta a própria alocação selecionada, sem buscar nomes ou inferir sua origem. */
export function informacoesDaAlocacao(aula: AlocacaoResponse): InformacoesAula {
    return {
        materia: aula.disciplina.nome,
        professor: aula.professor?.nome?.trim() || '',
        sala: aula.sala?.codigo?.trim() || '',
        ...(aula.origem ? { referencias: {
            materia: referenciaAcademica(aula.origem, aula.disciplina.id),
            professor: referenciaAcademica(aula.origem, aula.professor?.id),
            sala: referenciaAcademica(aula.origem, aula.sala?.id),
        } } : {}),
    };
}
