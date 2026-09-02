/**
 * Tipos de equipamento previstos na issue "WEB: Informações dos equipamentos
 * da sala" (#61): Wi-Fi, televisões, cadeiras e computadores.
 */
export type TipoEquipamento = 'Wi-Fi' | 'Televisão' | 'Cadeira' | 'Computador';

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