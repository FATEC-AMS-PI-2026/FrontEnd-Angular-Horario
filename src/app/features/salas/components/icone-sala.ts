import { Component, computed, input } from '@angular/core';
@Component({
  selector: 'app-icone-sala',
  template: `<span class="icone-sala" aria-hidden="true">
    <span class="icone-sala__imagem" [style.mask-image]="laboratorio() ? 'url(/icons/salas/laboratorio.png)' : 'url(/icons/salas/sala.png)'"></span>
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
      width: 47px;
      height: 47px;
      background: var(--color-primary);
      mask-size: contain;
      mask-repeat: no-repeat;
      mask-position: center;
    }
  `],
})
export class IconeSala {
  readonly nome = input('');
  readonly tipo = input<string>();
  readonly laboratorio = computed(() => /lab/i.test(this.tipo() || this.nome()));
}
