import { PageResponse } from '../../core/models/page-response';

/** Lê os contratos Java em camelCase ou snake_case sem presumir o formato recebido. */
export function ler(registro: unknown, campo: string): unknown {
    if (!registro || typeof registro !== 'object') return undefined;
    const campos = registro as Record<string, unknown>;
    const snake = campo.replace(/[A-Z]/g, letra => '_' + letra.toLowerCase());
    return campos[campo] !== undefined ? campos[campo] : campos[snake];
}

/** Não permite publicar uma listagem parcial como se a consulta estivesse completa. */
export function paginaDaApi(
    resposta: unknown, solicitada: number, totalEsperado?: number,
): Pick<PageResponse<unknown>, 'content' | 'page' | 'totalPages'> {
    const page = ler(resposta, 'page');
    const totalPages = ler(resposta, 'totalPages');
    const content = ler(resposta, 'content');
    if (page !== solicitada || typeof totalPages !== 'number' || !Number.isSafeInteger(totalPages) || totalPages < 0 ||
        !Array.isArray(content) || (totalPages > solicitada + 1 && !content.length) ||
        (totalPages === 0 ? solicitada !== 0 || content.length > 0 : solicitada >= totalPages) ||
        (totalEsperado !== undefined && totalEsperado !== totalPages)) {
        throw new Error('Paginação incompleta na resposta do servidor.');
    }
    return { page: solicitada, totalPages, content };
}
