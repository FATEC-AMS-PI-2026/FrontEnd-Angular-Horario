import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Equipamento, TipoEquipamento } from '../../models/equipamento';
import { FigmaIcon, FigmaIconName } from '../../../../shared/components/figma-icon/figma-icon';

const ICONES: Record<TipoEquipamento, FigmaIconName> = {
  'Wi-Fi': 'wifi', 'Televisão': 'television', 'Cadeira': 'chair',
  'Computador': 'computer', 'Ar-condicionado': 'air-conditioning',
  'Projetor multimidia': 'projector',
};

@Component({
  selector: 'app-equipamentos-card',
  imports: [FigmaIcon],
  templateUrl: './equipamentos-card.html',
  styleUrl: './equipamentos-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipamentosCard {
  /** null indica informação indisponível; [] confirma ausência de cadastro. */
  readonly equipamentos = input<readonly Equipamento[] | null>(null);
  readonly carregando = input(false);
  readonly erro = input<string | null>(null);
  readonly compacto = input(false);
  protected readonly restantes = computed(() => this.compacto()
    ? Math.max(0, (this.equipamentos()?.length ?? 0) - 3) : 0);
  protected readonly linhas = computed(() => (this.equipamentos() ?? [])
    .slice(0, this.compacto() ? 3 : undefined).map((dado, indice) => ({
      chave: dado.id ?? indice, nome: dado.nome ?? dado.tipo,
      icone: Object.hasOwn(ICONES, dado.tipo) ? ICONES[dado.tipo as TipoEquipamento] : 'generic' as const,
      categoria: dado.categoria, dado,
    })));

  protected descricao(nome: string, dado: Equipamento): string {
    return dado.quantidadeDisponivel === undefined ? `${nome}: quantidade cadastrada ${dado.quantidadeTotal}`
      : `${dado.quantidadeDisponivel} de ${dado.quantidadeTotal} disponíveis`;
  }
}
