import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Equipamento, TipoEquipamento } from '../../models/equipamento';
import { RecursoSala } from '../../models/recurso-sala';

const ITENS: { tipo: TipoEquipamento; nome: string; icone: string }[] = [
  { tipo: 'Wi-Fi', nome: 'Wi-fi', icone: 'wifi' },
  { tipo: 'Televisão', nome: 'Televisões', icone: 'televisao' },
  { tipo: 'Cadeira', nome: 'Cadeiras', icone: 'cadeira' },
  { tipo: 'Computador', nome: 'Computadores', icone: 'computador' },
  { tipo: 'Ar-condicionado', nome: 'Ar-condicionado', icone: 'ar-condicionado' },
];

/** Ícone aproximado pelo nome livre do recurso vindo do backend; sem correspondência, fica sem ícone. */
const ICONES_RECURSO: [RegExp, string][] = [
  [/comput|desktop|notebook/i, 'computador'],
  [/projetor|tv|televis|monitor/i, 'televisao'],
  [/cadeira|mesa|carteira/i, 'cadeira'],
  [/wi-?fi|rede/i, 'wifi'],
  [/ar[- ]condicionado|climatiz/i, 'ar-condicionado'],
];

@Component({
  selector: 'app-equipamentos-card',
  templateUrl: './equipamentos-card.html',
  styleUrl: './equipamentos-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipamentosCard {
  readonly equipamentos = input<Equipamento[]>([]);
  readonly compacto = input(false);
  readonly laboratorio = input(false);
  /** Recursos reais da sala (backend Java, #149). `null` = usar os tipos fixos acima. */
  readonly recursos = input<RecursoSala[] | null>(null);
  readonly carregandoRecursos = input(false);
  /** Mensagem quando a consulta dos recursos falhou. */
  readonly erroRecursos = input<string | null>(null);
  /** No card compacto da lista cabem 3 itens; o resto vira "+N". */
  protected readonly restantes = computed(() => this.compacto() ? Math.max(0, (this.recursos() ?? []).length - 3) : 0);
  protected readonly linhasRecursos = computed(() => (this.recursos() ?? []).slice(0, this.compacto() ? 3 : undefined).map(r => ({
    ...r, icone: ICONES_RECURSO.find(([padrao]) => padrao.test(r.nome))?.[1] ?? null,
  })));
  protected readonly linhas = computed(() => {
    const ordem: TipoEquipamento[] = this.laboratorio()
      ? ['Wi-Fi', 'Televisão', 'Computador'] : ['Wi-Fi', 'Cadeira', 'Televisão'];
    const itens = this.compacto() ? ordem.map(tipo => ITENS.find(i => i.tipo === tipo)!) : ITENS;
    return itens.map(i => ({ ...i, dado: this.equipamentos().find(e => e.tipo === i.tipo) }));
  });
}
