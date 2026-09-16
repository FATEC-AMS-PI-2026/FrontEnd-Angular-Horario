import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

// Nomes definidos por StandardError e ValidationError no backend Java/Spring.
export interface StandardError {
    timeStamp: string;
    status: number;
    error: string;
    message: string;
    path: string;
}

export interface ValidationError extends StandardError {
    errors: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
    mensagem(error: unknown, fallback: string, login = false): string {
        if (!(error instanceof HttpErrorResponse)) return fallback;
        if (error.status === 0) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
        if (error.status === 401) return login && (!error.url || /\/auth\/login(?:\?|$)/.test(error.url))
            ? 'E-mail ou senha inválidos. Tente novamente.'
            : 'Sua sessão expirou. Entre novamente para continuar.';
        if (error.status === 403) return 'Você não tem permissão para realizar esta operação.';
        if (error.status === 429) return 'Muitas tentativas. Aguarde um momento antes de tentar novamente.';

        const body: unknown = error.error;
        if (!body || typeof body !== 'object') return fallback;
        const payload = body as Partial<ValidationError>;
        if (error.status === 422 && Array.isArray(payload.errors)) {
            const mensagens = payload.errors.filter((item): item is string =>
                typeof item === 'string' && !!item.trim());
            if (mensagens.length) return [...new Set(mensagens)].join(' ');
        }
        // O Java também retorna mensagens de SQL/serialização. Apenas erros de negócio
        // e parâmetro conhecidos podem fornecer texto diretamente à interface.
        const publico = (error.status === 409 && payload.error === 'Erro de regra de negócio') ||
            (error.status === 400 && ['Erro de parâmetro', 'Parâmetro inválido'].includes(payload.error ?? '')) ||
            (error.status === 422 && payload.error === 'Erro de validação');
        return publico && typeof payload.message === 'string' && payload.message.trim()
            ? payload.message : fallback;
    }
}
