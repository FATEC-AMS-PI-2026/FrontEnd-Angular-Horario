import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ProblemaEquipamento } from '../../models/problema-equipamento';

/**
 * Banners de alerta para equipamentos indisponíveis ou com defeito. Cobre a
 * issue "WEB: Alertas de equipamento indisponível" (#9):
 *
 * - A seção inteira some automaticamente quando não há nenhum problema
 *   reportado (`problemas()` vazio) — ver o `@if` no template.
 * - Cada banner é clicável: expande/recolhe o detalhe do problema
 *   (equipamento, descrição e data do reporte).
 * - Cor diferenciada por severidade: vermelho para equipamento
 *   indisponível, amarelo para equipamento com defeito.
 */
@Component({
  selector: 'app-alertas-equipamento-card',
  templateUrl: './alertas-equipamento-card.html',
  styleUrl: './alertas-equipamento-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasEquipamentoCard {
  /** Problemas de equipamento reportados para a sala. */
  readonly problemas = input.required<ProblemaEquipamento[]>();

  /** Índices dos banners atualmente expandidos. */
  private readonly indicesExpandidos = signal<ReadonlySet<number>>(new Set());

  protected expandido(indice: number): boolean {
    return this.indicesExpandidos().has(indice);
  }

  /** Alterna a exibição do detalhe (descrição + data do reporte) de um banner. */
  protected alternar(indice: number): void {
    const atualizado = new Set(this.indicesExpandidos());
    if (atualizado.has(indice)) {
      atualizado.delete(indice);
    } else {
      atualizado.add(indice);
    }
    this.indicesExpandidos.set(atualizado);
  }

  protected rotuloSeveridade(problema: ProblemaEquipamento): string {
    return problema.severidade === 'indisponivel' ? 'Indisponível' : 'Defeito';
  }
}
