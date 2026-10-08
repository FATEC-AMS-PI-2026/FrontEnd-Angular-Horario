import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SalasApiService } from '../../services/salas-api';
import { StatusSalaBadge } from '../../components/status-sala-badge';
import { IconeSala } from '../../components/icone-sala';
import { EquipamentosCard } from '../../components/equipamentos-card/equipamentos-card';
import { SalaResumo } from '../../models/sala-resumo';
import { RecursosSalaService } from '../../services/recursos-sala';
import { ConsultaSalasService } from '../../services/consulta-salas';

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
  providers: [RecursosSalaService, ConsultaSalasService, SalasApiService],
})
export class ListaSalas {
  protected readonly recursos = inject(RecursosSalaService);
  private readonly consulta = inject(ConsultaSalasService);
  protected readonly locais = this.consulta.locais;
  protected readonly salas = this.consulta.salas;
  protected readonly estadoAgenda = this.consulta.estadoAgenda;
  protected disponibilidade(sala: SalaResumo) { return this.consulta.disponibilidade(sala); }
  protected readonly carregando = this.consulta.carregando;
  protected readonly erro = this.consulta.erro;
  protected readonly avisoRemoto = computed(() => {
    const falhas = [
      { nome: 'cadastro', erro: this.erro(), prefixo: '' },
      { nome: 'disponibilidade', erro: this.estadoAgenda().erro, prefixo: 'Não foi possível confirmar a disponibilidade das salas. ' },
      { nome: 'equipamentos', erro: this.recursos.erro(), prefixo: 'Recursos das salas: ' },
    ].filter(falha => !!falha.erro);
    if (!falhas.length) return null;
    if (falhas.length === 1) return falhas[0].prefixo + falhas[0].erro;
    const mensagens = [...new Set(falhas.map(falha => falha.erro))].join(' ');
    return `Não foi possível atualizar os dados das salas (${falhas.map(falha => falha.nome).join(', ')}). ${mensagens}`;
  });

  constructor() {
    this.recursos.carregar();
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
    // Uma ação recupera as fontes remotas que falharam, preservando as já carregadas.
    this.consulta.tentarNovamente();
    if (this.recursos.erro()) this.recursos.carregar();
  }

}
