import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { backendInterceptor } from './core/services/backend.interceptor';
import { routes } from './app.routes';
import { inject } from '@angular/core';
import { defer, throwError } from 'rxjs';
import { CARREGAR_GRADE_DIA, GradeIndisponivelError } from './features/dashboard/services/dashboard.service';
// TEMPORÁRIO: excluir esta importação local após integrar o backend Java.
import { DadosLocaisService } from './features/dados-locais/services/dados-locais.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([backendInterceptor])),
        // TEMPORÁRIO: excluir este provider local e fornecer o adaptador Java de CARREGAR_GRADE_DIA.
        {
            provide: CARREGAR_GRADE_DIA, useFactory: () => {
                const local = inject(DadosLocaisService);
                return (data: string) => local.ativo ? defer(() => local.grade(data))
                    : throwError(() => new GradeIndisponivelError());
            }
        }
    ]
};
