import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Equipamento } from '../models/equipamento';

/**
 * Card responsável por organizar e apresentar os equipamentos de uma sala.
 * Cobre a issue "WEB: Card de equipamentos da sala" (#69): componentiza a
 * exibição de equipamentos (antes embutida direto em `detalhes-sala`) para
 * que possa ser reutilizada em outras telas.
 *
 * Os dados exibidos (quantidade disponível/total, destaque de equipamentos
 * indisponíveis) seguem os mesmos critérios definidos na issue #61.
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
}