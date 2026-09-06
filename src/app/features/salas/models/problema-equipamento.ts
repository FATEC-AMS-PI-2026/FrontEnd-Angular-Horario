import { TipoEquipamento } from './equipamento';

/**
 * Severidade de um problema reportado em um equipamento, usada para
 * diferenciar a cor do banner de alerta — critério de aceite da issue
 * "WEB: Alertas de equipamento indisponível" (#9): vermelho quando o
 * equipamento está indisponível, amarelo quando está com defeito mas ainda
 * pode ser utilizado.
 */
export type SeveridadeProblemaEquipamento = 'indisponivel' | 'defeito';

/**
 * Problema reportado em um equipamento de uma sala. Alimenta os banners de
 * alerta da issue #9: cada problema vira um banner clicável que revela o
 * equipamento, a descrição e a data do reporte.
 */
export interface ProblemaEquipamento {
  equipamento: TipoEquipamento;
  severidade: SeveridadeProblemaEquipamento;
  /** Descrição do problema relatado (ex.: "Tela não liga"). */
  descricao: string;
  /** Data em que o problema foi reportado, no formato `dd/MM/yyyy`. */
  dataReporte: string;
}
