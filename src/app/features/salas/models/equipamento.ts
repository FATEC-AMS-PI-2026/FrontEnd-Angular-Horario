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
 * Equipamento cadastrado em uma sala, com a quantidade total e a quantidade
 * atualmente disponível. Um equipamento é considerado indisponível quando
 * `quantidadeDisponivel` é 0.
 */
export interface Equipamento {
  tipo: TipoEquipamento;
  quantidadeTotal: number;
  quantidadeDisponivel: number;
}
