import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Equipamento } from '../../models/equipamento';

/**
 * Banners de alerta para equipamentos indisponíveis ou com problema na sala.
 * Cobre a issue "WEB: Alertas de equipamentos da sala" (#43):
 *
 * - Identifica equipamentos com problema a partir da mesma regra usada no
 *   `EquipamentosCard` (issues #8/#61): `quantidadeDisponivel <= 0`.
 * - Exibe um alerta por equipamento indisponível, na página da sala, dizendo
 *   qual equipamento está com problema.
 * - Não renderiza nada quando não há equipamento indisponível (nenhum alerta
 *   desnecessário).
 */
@Component({
  selector: 'app-alertas-equipamentos',
  templateUrl: './alertas-equipamentos.html',
  styleUrl: './alertas-equipamentos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasEquipamentos {
  /** Lista de equipamentos da sala, usada para calcular quais têm problema. */
  readonly equipamentos = input.required<Equipamento[]>();

  /** Equipamentos sem nenhuma unidade disponível (indisponíveis). */
  protected readonly equipamentosComProblema = computed(() =>
    this.equipamentos().filter((equipamento) => equipamento.quantidadeDisponivel <= 0),
  );
}
