import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasService } from '../services/salas';
import { StatusSalaBadge } from '../status-sala-badge/status-sala-badge';
/**
 * Página de listagem de salas. Cada card leva para a página de detalhes
 * (issue #67 — navegação entre lista e detalhes).
 */
@Component({
  selector: 'app-lista-salas',
  imports: [RouterLink, StatusSalaBadge],
  templateUrl: './lista-salas.html',
  styleUrl: './lista-salas.scss',
})
export class ListaSalas {
  private readonly salasService = inject(SalasService);
  protected readonly salas = this.salasService.salas;
}
