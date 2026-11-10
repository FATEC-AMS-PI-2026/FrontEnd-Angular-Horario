import { Component, computed, input } from '@angular/core';
import { FigmaIcon } from '../../../shared/components/figma-icon/figma-icon';
@Component({
  selector: 'app-icone-sala',
  imports: [FigmaIcon],
  template: `<span class="icone-sala" [class.icone-sala--compacto]="tamanho() === 'compacto'" aria-hidden="true">
    <app-figma-icon class="icone-sala__imagem" [name]="laboratorio() ? 'laboratory' : 'classroom'" />
  </span>`,
  styles: [`
    :host { display: inline-block; flex: 0 0 auto; }
    .icone-sala {
      display: grid;
      place-items: center;
      width: 60px;
      height: 56px;
      border-radius: var(--radius-sala);
      background: var(--color-primary-pale);
      box-shadow: var(--shadow-card);
    }
    .icone-sala__imagem {
      --icon-size: 40px;
      color: var(--color-primary);
    }
    .icone-sala--compacto {
      width: 3rem;
      height: 3rem;
      border-radius: var(--radius-pill);
      box-shadow: none;
    }
    .icone-sala--compacto .icone-sala__imagem {
      --icon-size: 1.875rem;
    }
  `],
})
export class IconeSala {
  readonly nome = input('');
  readonly tipo = input<string>();
  readonly tamanho = input<'padrao' | 'compacto'>('padrao');
  readonly laboratorio = computed(() => /lab/i.test(this.tipo() || this.nome()));
}
