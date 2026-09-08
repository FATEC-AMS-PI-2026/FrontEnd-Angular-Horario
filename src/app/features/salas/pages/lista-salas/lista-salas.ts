import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasService } from '../../services/salas';
import { StatusSalaBadge } from '../../components/status-sala-badge';

type TipoFiltroSala = 'sala' | 'laboratorio';

function ehLaboratorio(tipo: string): boolean {
  return tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('laboratorio');
}
/**
 * Página de listagem de salas. Cada card leva para a página de detalhes
 * (issue #67 — navegação entre lista e detalhes).
 */
@Component({
  selector: 'app-lista-salas',
  standalone: true,
  imports: [RouterLink, StatusSalaBadge],
  templateUrl: './lista-salas.html',
  styleUrl: './lista-salas.scss',
})
export class ListaSalas {
  private readonly salasService = inject(SalasService);
  protected readonly salas = this.salasService.salas;

  /** Termo digitado no campo de busca (nome da sala). */
  protected readonly termoBusca = signal('');

  /** Prédio selecionado no filtro. `null` significa "todos os prédios". */
  protected readonly predioSelecionado = signal<string | null>(null);

  /** Tipo de ambiente selecionado nos botões. `null` mostra salas e laboratórios. */
  protected readonly tipoSelecionado = signal<TipoFiltroSala | null>(null);

  /** Lista de prédios distintos, derivada das salas cadastradas, para popular o filtro. */
  protected readonly predios = computed(() => {
    const nomes = this.salas().map((sala) => sala.predio);
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
  });

  /**
   * Lista de salas já filtrada pelo termo, prédio e tipo selecionados.
   *
   * Mantido como um `computed` separado (em vez de embutir a lógica no
   * template) para que busca e filtro por prédio componham naturalmente
   * entre si — e para que outros filtros futuros possam se juntar aqui
   * sem precisar reescrever o que já existe.
   */
  protected readonly salasFiltradas = computed(() => {
    const termo = this.termoBusca().trim().toLowerCase();
    const predio = this.predioSelecionado();
    const tipo = this.tipoSelecionado();
    let salas = this.salas();

    if (predio) {
      salas = salas.filter((sala) => sala.predio === predio);
    }

    if (tipo === 'laboratorio') {
      salas = salas.filter((sala) => ehLaboratorio(sala.tipo));
    } else if (tipo === 'sala') {
      salas = salas.filter((sala) => !ehLaboratorio(sala.tipo));
    }

    if (termo) {
      salas = salas.filter((sala) => sala.nome.toLowerCase().includes(termo));
    }

    return salas;
  });

  /** Mensagem exibida quando a combinação de busca + filtro não encontra nenhuma sala. */
  protected readonly mensagemVazia = computed(() => {
    const termo = this.termoBusca().trim();
    const predio = this.predioSelecionado();
    const tipo = this.tipoSelecionado();
    const tipoTexto = tipo === 'laboratorio' ? 'laboratórios' : tipo === 'sala' ? 'salas' : '';
    const contexto = [tipoTexto, predio].filter(Boolean).join(' em ');

    if (termo && contexto) {
      return 'Nenhuma sala encontrada para "' + termo + '" em ' + contexto + '.';
    }
    if (termo) {
      return 'Nenhuma sala encontrada para "' + termo + '".';
    }
    if (contexto) {
      return 'Nenhuma sala encontrada em ' + contexto + '.';
    }
    return 'Nenhuma sala encontrada.';
  });

  protected onBuscar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termoBusca.set(input.value);
  }

  protected onFiltrarPredio(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.predioSelecionado.set(select.value || null);
  }

  protected selecionarTipo(tipo: TipoFiltroSala | null): void {
    this.tipoSelecionado.update((atual) => (atual === tipo ? null : tipo));
  }
}
