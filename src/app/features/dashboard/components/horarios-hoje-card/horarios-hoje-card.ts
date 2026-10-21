import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FigmaIcon } from '../../../../shared/components/figma-icon/figma-icon';
import { ItemHorarioHoje } from '../../models/dashboard-cards';

@Component({
    selector: 'app-horarios-hoje-card',
    imports: [RouterLink, FigmaIcon],
    templateUrl: './horarios-hoje-card.html',
    styleUrl: './horarios-hoje-card.scss',
    host: { class: 'card card--schedule' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorariosHojeCard {
    readonly horarios = input.required<readonly ItemHorarioHoje[]>();
    readonly carregado = input(false);
    readonly dia = input.required<string>();
    readonly data = input.required<string>();
}
