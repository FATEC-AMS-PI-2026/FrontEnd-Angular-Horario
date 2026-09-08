import { Component, input } from '@angular/core';

export type FigmaIconName = 'lock' | 'alert' | 'bell' | 'moon' | 'logout' | 'chevron' | 'info' | 'shield' | 'file' | 'external';

@Component({
  selector: 'app-figma-icon',
  host: { 'aria-hidden': 'true' },
  template: '<span [style.mask-image]="\'url(/icons/configuracoes/\' + name() + \'.svg)\'"></span>',
  styleUrl: './figma-icon.scss',
})
export class FigmaIcon {
  readonly name = input.required<FigmaIconName>();
}
