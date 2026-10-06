import { Component, computed, input } from '@angular/core';
@Component({
  selector: 'app-icone-sala',
  template: '<span><img [src]="laboratorio() ? \'/icons/salas/laboratorio.png\' : \'/icons/salas/sala.png\'" alt="" /></span>',
  styles: [`:host { display: inline-block; flex: 0 0 auto; } span { display: grid; place-items: center; width: 60px; height: 56px; border-radius: var(--radius-sala); background: var(--color-primary-pale); box-shadow: var(--shadow-card); } img { width: 47px; height: 47px; object-fit: contain; }`],
})
export class IconeSala {
  readonly nome = input('');
  readonly tipo = input<string>();
  readonly laboratorio = computed(() => /lab/i.test(this.tipo() || this.nome()));
}
