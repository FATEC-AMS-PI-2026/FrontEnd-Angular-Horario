import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FigmaIconName, iconResource } from './icon-assets';

export type { FigmaIconName } from './icon-assets';

@Component({
  selector: 'app-figma-icon',
  host: { 'aria-hidden': 'true' },
  // Os PNGs originais também são monocromáticos; a máscara preserva os recortes
  // transparentes (incluindo o check) e permite contraste nos dois temas.
  template: `@if (resource().path) {
    <span class="icone__mascara" [class.icone__mascara--invertida]="resource().flipped"
      [style.mask-image]="'url(' + resource().path + ')'"></span>
  } @else { <span class="icone__simbolo">{{ resource().symbol }}</span> }`,
  styleUrl: './figma-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FigmaIcon {
  readonly name = input.required<FigmaIconName>();
  protected readonly resource = computed(() => iconResource(this.name()));
}
