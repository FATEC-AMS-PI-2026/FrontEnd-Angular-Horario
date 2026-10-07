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
      {{ texto() || status() }}
    </span>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: var(--space-3xs) var(--space-xs);
        border-radius: var(--radius-pill);
        font-size: var(--text-xs);
        font-weight: var(--fw-semibold);
        line-height: var(--leading-body);
        gap: var(--space-3xs);
        max-width: 100%;
        white-space: normal;
      }
      .badge-livre {
        background: var(--tag-verde-bg);
        color: var(--tag-verde-fg);
      }
      .badge-em-uso {
        background: var(--color-danger-bg);
        color: var(--color-danger);
      }
      .badge-manutencao {
        background: var(--color-warning-bg);
        color: var(--color-warning-fg);
      }
    `,
  ],
})
export class StatusSalaBadge {
  readonly status = input.required<StatusSala>();
  readonly texto = input<string>();
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
