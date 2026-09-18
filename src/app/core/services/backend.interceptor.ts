import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { BACKEND_CONFIG, BackendIndisponivelError } from './backend-config';

/** Controla somente a conexão configurada para o backend; arquivos locais continuam acessíveis. */
export const backendInterceptor: HttpInterceptorFn = (request, next) => {
    const config = inject(BACKEND_CONFIG);
    const base = config.url.replace(/\/+$/, '');
    const destino = request.url.split(/[?#]/, 1)[0];
    if (!base || (destino !== base && !destino.startsWith(base + '/'))) return next(request);

    if (!config.habilitado) {
        return throwError(() => new BackendIndisponivelError(
            'Esta operação depende do backend, que ainda não está integrado. Crie uma conta neste navegador pela tela de cadastro.',
        ));
    }
    // TEMPORÁRIO: excluir a verificação de tokens locais após integrar o backend Java.
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (token.startsWith('gini-local:')) {
        return throwError(() => new BackendIndisponivelError(
            'Um perfil local não pode acessar o servidor. Entre com uma conta do backend.',
        ));
    }
    return next(request);
};
