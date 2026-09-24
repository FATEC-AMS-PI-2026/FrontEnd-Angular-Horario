import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface BackendConfig {
  habilitado: boolean;
  url: string;
  /**
   * Primeiro segmento das rotas já integradas ao Java (ex.: `salas`), que
   * passam pelo interceptor mesmo com `habilitado` desligado.
   */
  modulos?: readonly string[];
}

export const BACKEND_CONFIG = new InjectionToken<BackendConfig>('BACKEND_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    habilitado: environment.backendHabilitado,
    url: environment.apiUrl,
    modulos: environment.modulosBackend,
  }),
});

export class BackendIndisponivelError extends Error {}
