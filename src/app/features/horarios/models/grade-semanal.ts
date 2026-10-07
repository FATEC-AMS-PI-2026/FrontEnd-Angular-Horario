import { CorMateria } from '../../../shared/utils/cores-materia';
import { AulaHorario, DiaSemana } from './item-horario';

export interface DiaGrade { valor: DiaSemana; nome: string; }

export interface AulaGrade extends AulaHorario { cor: CorMateria; }

/** Segmentos delimitados pelos inícios e términos retornados pela fonte de dados. */
export interface LinhaGrade {
    inicio: string;
    termino: string;
    intervalo: boolean;
    /** Uma célula por dia; ausência de alocação permanece vazia. */
    celulas: (AulaGrade | null)[];
}
