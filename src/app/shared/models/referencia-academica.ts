/** Identidade confirmada pela fonte; números locais nunca identificam registros Java. */
export type OrigemAcademica = 'local' | 'java';
export interface ReferenciaAcademica { origem: OrigemAcademica; id: number; }

export function referenciaAcademica(origem: unknown, id: unknown): ReferenciaAcademica | undefined {
    return (origem === 'local' || origem === 'java') && typeof id === 'number'
        && Number.isSafeInteger(id) && id > 0 ? { origem, id } : undefined;
}

export function idDaReferencia(referencia: ReferenciaAcademica): string {
    return referencia.origem === 'local' ? `local-${referencia.id}` : String(referencia.id);
}

export function referenciaDaRota(parametro: string | null): ReferenciaAcademica | undefined {
    if (!parametro || !/^(local-)?[1-9]\d*$/.test(parametro)) return undefined;
    const local = parametro.startsWith('local-');
    return referenciaAcademica(local ? 'local' : 'java', Number(local ? parametro.slice(6) : parametro));
}
