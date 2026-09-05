import { Tecnico } from './tecnico';
import { Equipamento } from './equipamento';
import { ProximoHorario } from './proximo-horario';
import { ProblemaEquipamento } from './problema-equipamento';

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
   * Problemas reportados em equipamentos da sala (indisponibilidade ou
   * defeito). Normalmente vazio — cobre a issue "WEB: Alertas de
   * equipamento indisponível" (#9): os banners de alerta somem
   * automaticamente quando esta lista está vazia.
   */
  problemasEquipamentos: ProblemaEquipamento[];
}