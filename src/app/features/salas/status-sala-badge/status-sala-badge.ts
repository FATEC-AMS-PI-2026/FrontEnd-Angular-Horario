import { Component, computed, input } from '@angular/core';
import { StatusSala } from '../models/sala';
/**
 * Selo visual do status da sala. Cobre os critérios de aceite da issue #59:
 * status disponíveis (Livre / Em uso / Manutenção) com diferenciação visual.
 * Usa os tokens de cor de status já definidos em `src/styles.scss`.
 */
@Component({
  selector: 'app-status-sala-badge',
  template: `
    <span class="badge" [class]="classeCor()">
      {{ status() }}
    </span>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        line-height: 1.4;
        white-space: nowrap;
        color: #fff;
      }
      .badge-livre {
        background: var(--color-status-free);
      }
      .badge-em-uso {
        background: var(--color-status-busy);
      }
      .badge-manutencao {
        background: var(--color-status-maintenance);
      }
    `,
  ],
})
export class StatusSalaBadge {
  readonly status = input.required<StatusSala>();
  protected readonly classeCor = computed(() => {
    switch (this.status()) {
      case 'Livre':
        return 'badge-livre';
      case 'Em uso':
        return 'badge-em-uso';
      case 'Manutenção':
        return 'badge-manutencao';
    }
  });
}
