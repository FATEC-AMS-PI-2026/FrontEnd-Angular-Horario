import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProximoHorario } from '../../models/proximo-horario';

/**
 * Card com os próximos horários de utilização de uma sala. Cobre os
 * critérios de aceite da issue "WEB: Lista de próximos horários da sala"
 * (#44): início/término, atividade, professor responsável (quando houver) e
 * ordem cronológica — a ordenação é responsabilidade de quem fornece os
 * dados (serviço/API), o componente apenas apresenta a lista recebida.
 */
@Component({
  selector: 'app-proximos-horarios-card',
  templateUrl: './proximos-horarios-card.html',
  styleUrl: './proximos-horarios-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProximosHorariosCard {
  /** Próximos horários da sala, já ordenados cronologicamente. */
  readonly horarios = input.required<ProximoHorario[]>();
}
