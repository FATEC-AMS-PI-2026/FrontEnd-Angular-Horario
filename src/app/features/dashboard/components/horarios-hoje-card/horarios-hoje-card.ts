import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FigmaIcon } from '../../../../shared/components/figma-icon/figma-icon';
import { ItemHorarioHoje } from '../../models/dashboard-cards';
import { AlocacaoResponse } from '../../models/grade-dia.model';

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
    readonly abrirAula = output<{ aula: AlocacaoResponse; botao: HTMLElement }>();

    protected abrirInformacoes(aula: AlocacaoResponse, evento: Event): void {
        this.abrirAula.emit({ aula, botao: evento.currentTarget as HTMLElement });
    }
}
