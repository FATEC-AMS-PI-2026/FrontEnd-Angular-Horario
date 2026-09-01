import { Component, computed, inject, signal } from '@angular/core';
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
  /** Termo digitado no campo de busca (nome da sala). */
  protected readonly termoBusca = signal('');
  /**
   * Lista de salas já filtrada pelo termo de busca.
   *
   * Mantido como um `computed` separado (em vez de embutir a lógica de
   * busca direto no template) para que outros critérios de filtragem —
   * por exemplo, o filtro por prédio da issue #46 — possam ser compostos
   * aqui no futuro sem precisar reescrever a busca já existente.
   */
  protected readonly salasFiltradas = computed(() => {
    const termo = this.termoBusca().trim().toLowerCase();
    const salas = this.salas();
    if (!termo) {
      return salas;
    }
    return salas.filter((sala) => sala.nome.toLowerCase().includes(termo));
  });
  protected onBuscar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }
}
