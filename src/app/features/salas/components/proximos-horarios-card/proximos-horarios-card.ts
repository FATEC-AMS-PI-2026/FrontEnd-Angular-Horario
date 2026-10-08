import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProximoHorario } from '../../models/proximo-horario';

/**
 * Card com aulas futuras e intervalos sem aula cadastrada na sala. Cobre os
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
  /** Aulas e blocos "Sala vazia", já ordenados cronologicamente. */
  readonly horarios = input.required<ProximoHorario[]>();
  readonly carregando = input(false);
  readonly indisponivel = input(false);
}
