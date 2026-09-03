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
}
