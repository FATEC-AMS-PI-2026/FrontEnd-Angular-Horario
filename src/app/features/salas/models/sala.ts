import { Tecnico } from './tecnico';
import { Equipamento } from './equipamento';

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
}