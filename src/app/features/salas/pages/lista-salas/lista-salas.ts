import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasApiService } from '../../services/salas-api';
import { StatusSalaBadge } from '../../components/status-sala-badge';
import { SalasLocaisService, unirSalas, aulasLocaisDaSala } from '../../services/salas-locais';
import { IconeSala } from '../../components/icone-sala';
import { EquipamentosCard } from '../../components/equipamentos-card/equipamentos-card';
import { DisponibilidadeSalaService, calcularDisponibilidade, aulasJavaDaSala, unirAulas } from '../../services/disponibilidade-sala';
import { RelogioService } from '../../services/relogio';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, map, of, startWith, timer } from 'rxjs';
import { SalaResumo } from '../../models/sala-resumo';

/**
 * Página de listagem de salas, com dados do backend Java (issue #132). Cada
 * card leva para a página de detalhes (issue #67 — navegação entre lista e
 * detalhes).
 */
@Component({
  selector: 'app-lista-salas',
  standalone: true,
  imports: [RouterLink, StatusSalaBadge, IconeSala, EquipamentosCard],
  templateUrl: './lista-salas.html',
  styleUrl: './lista-salas.scss',
})
export class ListaSalas {
  private readonly salasApi = inject(SalasApiService);
  protected readonly locais = inject(SalasLocaisService);
  private readonly horarios = inject(DisponibilidadeSalaService);
  private readonly relogio = inject(RelogioService);
  protected readonly salas = computed(() => unirSalas(this.erro() ? [] : this.salasApi.salas(), this.locais.salas()));
  private readonly agenda = toSignal(this.horarios.agendaCompleta ? timer(0, 60000).pipe(
    exhaustMap(() => this.horarios.carregar().pipe(catchError(() => of(null)), startWith(null))),
  ) : of(null));
  private readonly agora = toSignal(timer(0, 1000).pipe(map(() => this.relogio.agora())), { initialValue: this.relogio.agora() });
  protected disponibilidade(sala: SalaResumo) {
    const agenda = this.agenda();
    if (sala.origem === 'local' || !agenda) return undefined;
    const aulas = unirAulas(aulasJavaDaSala(sala.id, agenda, this.agora()), aulasLocaisDaSala(this.locais.catalogo(), sala.nome, this.agora()));
    return calcularDisponibilidade(sala.id, agenda, this.agora(), aulas.filter(a => a.origem === 'local'));
  }
  protected readonly carregando = this.salasApi.carregando;
  protected readonly erro = this.salasApi.erro;

  constructor() {
    this.salasApi.carregar();
  }

  /** Termo digitado no campo de busca (nome da sala). */
  protected readonly termoBusca = signal('');

  /** Prédio selecionado no filtro. `null` significa "todos os prédios". */
  protected readonly predioSelecionado = signal<string | null>(null);

  /** Tipo de sala selecionado nos botões. `null` mostra todos os tipos. */
  protected readonly tipoSelecionado = signal<string | null>(null);

  /**
   * Lista de prédios distintos, derivada das salas cadastradas, para popular
   * o filtro. Fica vazia enquanto o backend não informar o prédio (#109), e
   * aí o filtro nem aparece.
   */
  protected readonly predios = computed(() => {
    const nomes = this.salas()
      .map((sala) => sala.predio)
      .filter((predio): predio is string => !!predio);
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
  });

  /** Tipos de sala distintos retornados pelo backend, um chip para cada. */
  protected readonly tipos = computed(() =>
    Array.from(new Set(this.salas().map((sala) => sala.tipo).filter((tipo): tipo is string => !!tipo))).sort((a, b) => a.localeCompare(b)),
  );

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

    if (tipo) {
      salas = salas.filter((sala) => sala.tipo === tipo);
    }

    if (termo) {
      salas = salas.filter((sala) => sala.nome.toLowerCase().includes(termo));
    }

    return salas;
  });

  /** Mensagem exibida quando a combinação de busca + filtro não encontra nenhuma sala. */
  protected readonly mensagemVazia = computed(() => {
    const termo = this.termoBusca().trim();
    const contexto = [this.tipoSelecionado(), this.predioSelecionado()].filter(Boolean).join(' em ');

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

  protected selecionarTipo(tipo: string | null): void {
    this.tipoSelecionado.update((atual) => (atual === tipo ? null : tipo));
  }

  protected tentarNovamente(): void {
    this.salasApi.carregar();
  }
}
