import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalaResumo } from '../../models/sala-resumo';
import { DisponibilidadeSala } from '../../services/disponibilidade-sala';
import { StatusSalaBadge } from '../status-sala-badge';
import { IconeSala } from '../icone-sala';

@Component({
  selector: 'app-cabecalho-sala',
  imports: [RouterLink, StatusSalaBadge, IconeSala],
  templateUrl: './cabecalho-sala.html',
  styleUrl: './cabecalho-sala.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabecalhoSala {
  readonly sala = input.required<SalaResumo>();
  readonly disponibilidade = input<DisponibilidadeSala>();
}
