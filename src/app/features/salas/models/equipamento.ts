/**
 * Tipos de equipamento previstos na issue "WEB: Informações dos equipamentos
 * da sala" (#61) e complementados pela issue "WEB: Card de equipamentos da
 * sala" (#8): Wi-Fi, televisões, cadeiras, computadores e ar-condicionado.
 */
export type TipoEquipamento =
  | 'Wi-Fi'
  | 'Televisão'
  | 'Cadeira'
  | 'Computador'
  | 'Ar-condicionado';

/**
 * Nível de disponibilidade de um equipamento, usado para destacar o card com
 * cor verde (100% disponível), amarela (parcialmente disponível) ou vermelha
 * (indisponível) — critério de aceite da issue #8.
 */
export type DisponibilidadeEquipamento = 'total' | 'parcial' | 'indisponivel';

/**
 * Recurso cadastrado em uma sala. A quantidade disponível é opcional: o
 * contrato Java atual informa apenas a quantidade cadastrada, sem estado
 * de funcionamento. Nome e categoria preservam os valores do backend.
 */
export interface Equipamento {
  tipo: string;
  id?: number;
  nome?: string;
  categoria?: string;
  quantidadeTotal: number;
  /** Ausente quando o backend informa apenas o inventário cadastrado. */
  quantidadeDisponivel?: number;
}
