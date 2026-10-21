import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FigmaIcon } from '../../../../shared/components/figma-icon/figma-icon';
import { IconeSala } from '../../../salas/components/icone-sala';
import { SalaHoje } from '../../services/salas-hoje';

@Component({
    selector: 'app-salas-hoje-card',
    imports: [RouterLink, FigmaIcon, IconeSala],
    templateUrl: './salas-hoje-card.html',
    styleUrl: './salas-hoje-card.scss',
    host: {
        class: 'card card--today-rooms',
        '[attr.aria-busy]': 'carregando() || carregandoSalas()',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalasHojeCard {
    readonly salas = input.required<readonly SalaHoje[]>();
    readonly carregado = input(false);
    readonly carregando = input(false);
    readonly carregandoSalas = input(false);
    readonly indisponivel = input(false);
    readonly erro = input('');
}
