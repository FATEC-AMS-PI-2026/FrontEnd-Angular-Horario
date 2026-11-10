import { CorMateria } from '../../../shared/utils/cores-materia';
import { SalaResumo } from '../../salas/models/sala-resumo';
import { DisponibilidadeSala } from '../../salas/services/disponibilidade-sala';
import { AlocacaoResponse } from './grade-dia.model';

/** Dados de apresentação calculados pela dashboard; os cards não consultam serviços. */
export interface ItemHorarioHoje {
    id: string;
    horaInicio: string;
    horaFim: string;
    aula: AlocacaoResponse | null;
    cor?: CorMateria;
    professor?: string;
}

export interface ItemStatusSala {
    sala: SalaResumo;
    doAluno: boolean;
    disponibilidade?: DisponibilidadeSala;
    professores: string;
}

export interface GrupoStatusSalas {
    titulo: string | null;
    itens: readonly ItemStatusSala[];
}
