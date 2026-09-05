import { Tecnico } from './tecnico';
import { Equipamento } from './equipamento';
import { ProximoHorario } from './proximo-horario';
import { AulaDoDia } from './aula-do-dia';

/**
 * Status possíveis de uma sala, conforme critério de aceite da issue
 * "WEB: Status da sala (Livre, Em uso e Manutenção)" (#59).
 */
export type StatusSala = 'Livre' | 'Em uso' | 'Manutenção';

export interface Sala {
  id: number;
  nome: string;
  predio: string;
  andar: number;
  capacidade: number;
  tipo: string;
  status: StatusSala;
  /**
   * Equipamentos cadastrados na sala, com quantidade total e disponível.
   * Cobre a issue "WEB: Informações dos equipamentos da sala" (#61).
   */
  equipamentos: Equipamento[];
  /** Técnico responsável pela sala, quando houver (issue #49). */
  tecnicoResponsavel?: Tecnico;
  /**
   * Próximos horários de utilização da sala, em ordem cronológica. Cobre a
   * issue "WEB: Lista de próximos horários da sala" (#44).
   */
  proximosHorarios: ProximoHorario[];
  /**
   * Todas as aulas agendadas na sala para o dia atual (passadas, em
   * andamento e futuras). Cobre a issue "WEB: Lista de aulas do dia na
   * sala" (#12).
   */
  aulasDoDia: AulaDoDia[];
}