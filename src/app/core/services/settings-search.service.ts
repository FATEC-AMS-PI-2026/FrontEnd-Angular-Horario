import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SettingsSearchService {
  readonly termo = signal('');

  corresponde(texto: string): boolean {
    const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalizar(texto).includes(normalizar(this.termo().trim()));
  }
}
