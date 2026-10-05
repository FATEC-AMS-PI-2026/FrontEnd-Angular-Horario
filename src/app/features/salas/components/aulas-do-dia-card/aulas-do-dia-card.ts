import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AulaDoDia } from '../../models/aula-do-dia';
import { RelogioService } from '../../services/relogio';
import { momentoSaoPaulo } from '../../services/disponibilidade-sala';

/** Minutos desde 00:00 de um horário `HH:mm`, para comparar/ordenar. */
function paraMinutos(horario: string): number {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Card com todas as aulas do dia atual na sala, destacando a que está em
 * andamento. Cobre os critérios de aceite da issue "WEB: Lista de aulas do
 * dia na sala" (#12): horário de início/fim, disciplina, professor e turma;
 * badge "Agora" na aula em andamento; ordem cronológica crescente.
 */
@Component({
  selector: 'app-aulas-do-dia-card',
  templateUrl: './aulas-do-dia-card.html',
  styleUrl: './aulas-do-dia-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AulasDoDiaCard {
  private readonly relogio = inject(RelogioService);

  /** Aulas do dia na sala, em qualquer ordem — o componente ordena. */
  readonly aulas = input.required<AulaDoDia[]>();
  readonly agora = input<Date>();

  /** Aulas ordenadas por horário de início crescente (critério de aceite). */
  protected readonly aulasOrdenadas = computed(() =>
    [...this.aulas()].sort((a, b) => paraMinutos(a.inicio) - paraMinutos(b.inicio)),
  );

  /**
   * `true` quando o horário atual está entre o início (inclusive) e o
   * término (exclusive) da aula — usado para exibir o badge "Agora".
   */
  protected estaEmAndamento(aula: AulaDoDia): boolean {
    const minutosAgora = momentoSaoPaulo(this.agora() ?? this.relogio.agora()).segundos / 60;
    return minutosAgora >= paraMinutos(aula.inicio) && minutosAgora < paraMinutos(aula.termino);
  }
}
