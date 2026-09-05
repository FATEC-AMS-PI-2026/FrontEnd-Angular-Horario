import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DisponibilidadeEquipamento, Equipamento } from '../../models/equipamento';

/**
 * Card responsável por organizar e apresentar os equipamentos de uma sala.
 * Cobre a issue "WEB: Card de equipamentos da sala" (#69): componentiza a
 * exibição de equipamentos (antes embutida direto em `detalhes-sala`) para
 * que possa ser reutilizada em outras telas.
 *
 * Os dados exibidos (quantidade disponível/total, destaque de equipamentos
 * indisponíveis) seguem os mesmos critérios definidos na issue #61.
 *
 * O destaque por cor (verde/amarelo/vermelho conforme a disponibilidade) e o
 * contador "disponível/total" seguem o critério de aceite da issue #8.
 *
 * O indicador visual de proporção disponível/total (barra de progresso por
 * equipamento) atende aos critérios de aceite da issue "WEB: Indicadores de
 * capacidade dos equipamentos" (#71).
 */
@Component({
  selector: 'app-equipamentos-card',
  templateUrl: './equipamentos-card.html',
  styleUrl: './equipamentos-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipamentosCard {
  /** Lista de equipamentos a serem exibidos no card. */
  readonly equipamentos = input.required<Equipamento[]>();

  /**
   * Nível de disponibilidade do equipamento: `total` quando todos estão
   * disponíveis (destaque verde), `parcial` quando parte está disponível
   * (destaque amarelo) ou `indisponivel` quando nenhum está (destaque
   * vermelho).
   */
  protected disponibilidade(equipamento: Equipamento): DisponibilidadeEquipamento {
    if (equipamento.quantidadeDisponivel <= 0) {
      return 'indisponivel';
    }
    if (equipamento.quantidadeDisponivel >= equipamento.quantidadeTotal) {
      return 'total';
    }
    return 'parcial';
  }

  /**
   * Proporção (0 a 100) da quantidade disponível em relação ao total de um
   * equipamento, usada para preencher a barra do indicador visual (issue
   * #71). Equipamentos sem quantidade total cadastrada (`quantidadeTotal`
   * zerado ou negativo) são tratados como 0% para evitar divisão por zero.
   */
  protected proporcao(equipamento: Equipamento): number {
    if (equipamento.quantidadeTotal <= 0) {
      return 0;
    }
    const proporcao = (equipamento.quantidadeDisponivel / equipamento.quantidadeTotal) * 100;
    return Math.min(100, Math.max(0, proporcao));
  }
}
