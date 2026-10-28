import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FigmaIcon } from '../../../../shared/components/figma-icon/figma-icon';
import { StatusSalaBadge } from '../../../salas/components/status-sala-badge';
import { GrupoStatusSalas } from '../../models/dashboard-cards';

@Component({
    selector: 'app-status-salas-card',
    imports: [RouterLink, FigmaIcon, StatusSalaBadge],
    templateUrl: './status-salas-card.html',
    styleUrl: './status-salas-card.scss',
    host: {
        class: 'card card--rooms',
        '[attr.aria-busy]': 'carregando() || consultandoAgenda()',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusSalasCard {
    readonly grupos = input.required<readonly GrupoStatusSalas[]>();
    readonly carregando = input(false);
    readonly consultandoAgenda = input(false);
    readonly aviso = input<string | null>(null);
    readonly erroLocal = input<string | null>(null);
    readonly tentarNovamente = output<void>();
    readonly tentarNovamenteLocal = output<void>();
}
