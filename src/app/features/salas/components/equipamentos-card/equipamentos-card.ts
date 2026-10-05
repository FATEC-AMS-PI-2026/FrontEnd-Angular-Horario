import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Equipamento, TipoEquipamento } from '../../models/equipamento';

const ITENS: { tipo: TipoEquipamento; nome: string; icone: string }[] = [
  { tipo: 'Wi-Fi', nome: 'Wi-fi', icone: 'wifi' },
  { tipo: 'Televisão', nome: 'Televisões', icone: 'televisao' },
  { tipo: 'Cadeira', nome: 'Cadeiras', icone: 'cadeira' },
  { tipo: 'Computador', nome: 'Computadores', icone: 'computador' },
  { tipo: 'Ar-condicionado', nome: 'Ar-condicionado', icone: 'ar-condicionado' },
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
  protected readonly linhas = computed(() => {
    const ordem: TipoEquipamento[] = this.laboratorio()
      ? ['Wi-Fi', 'Televisão', 'Computador'] : ['Wi-Fi', 'Cadeira', 'Televisão'];
    const itens = this.compacto() ? ordem.map(tipo => ITENS.find(i => i.tipo === tipo)!) : ITENS;
    return itens.map(i => ({ ...i, dado: this.equipamentos().find(e => e.tipo === i.tipo) }));
  });
}
