import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SalasService } from '../../services/salas';
import { StatusSalaBadge } from '../../components/status-sala-badge';
/**
 * Página de detalhes de uma sala. Cobre a issue #67: chegar aqui a partir da
 * lista, exibir os dados da sala selecionada e voltar para a lista sem
 * perder o estado da aplicação (navegação via Router, sem reload de página).
 */
@Component({
  selector: 'app-detalhes-sala',
  standalone: true,
  imports: [RouterLink, StatusSalaBadge],
  templateUrl: './detalhes-sala.html',
  styleUrl: './detalhes-sala.scss',
})
export class DetalhesSala {
  private readonly route = inject(ActivatedRoute);
  private readonly salasService = inject(SalasService);
  private readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: NaN },
  );
  protected readonly sala = computed(() => this.salasService.obterSalaPorId(this.id()));
}
