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
  recursos: string[];
}
