import { idDaReferencia, referenciaAcademica, referenciaDaRota } from './referencia-academica';

describe('Identidade acadêmica para navegação', () => {
    it('mantém namespaces diferentes mesmo com números iguais', () => {
        expect(idDaReferencia({ origem: 'local', id: 7 })).toBe('local-7');
        expect(idDaReferencia({ origem: 'java', id: 7 })).toBe('7');
        expect(referenciaDaRota('local-7')).toEqual({ origem: 'local', id: 7 });
        expect(referenciaDaRota('7')).toEqual({ origem: 'java', id: 7 });
    });
    it('não inventa fonte e recusa parâmetros ambíguos/inválidos', () => {
        expect(referenciaAcademica(undefined, 1)).toBeUndefined();
        for (const valor of [null, '', '0', '-1', 'local-0', '1.5', '1e2', '01', 'java-1', '9007199254740993']) {
            expect(referenciaDaRota(valor)).withContext(String(valor)).toBeUndefined();
        }
    });
});
