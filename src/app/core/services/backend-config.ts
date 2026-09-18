import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface BackendConfig {
  habilitado: boolean;
  url: string;
}

export const BACKEND_CONFIG = new InjectionToken<BackendConfig>('BACKEND_CONFIG', {
  providedIn: 'root',
  factory: () => ({ habilitado: environment.backendHabilitado, url: environment.apiUrl }),
});

export class BackendIndisponivelError extends Error {}
