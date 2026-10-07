import { PerfilResponse, periodoLetivoPendente } from './profile.model';

describe('periodoLetivoPendente', () => {
    const base: PerfilResponse = {
        usuario: { nome: 'Ana', email: '', curso: 'ADS', periodo: '1º ano' },
        cursoId: '1', disciplinasIds: ['1'], configuracaoInicialConcluida: true,
    };

    it('exige o onboarding enquanto a configuração inicial não foi concluída', () => {
        expect(periodoLetivoPendente(null)).toBeTrue();
        expect(periodoLetivoPendente({ ...base, configuracaoInicialConcluida: false })).toBeTrue();
    });

    it('libera quando o período letivo atual já foi confirmado', () => {
        expect(periodoLetivoPendente({ ...base, periodoLetivoAtual: '2026', periodoLetivoConfirmado: '2026' })).toBeFalse();
    });

    it('volta a exigir quando o servidor anuncia um novo período letivo', () => {
        expect(periodoLetivoPendente({ ...base, periodoLetivoAtual: '2027', periodoLetivoConfirmado: '2026' })).toBeTrue();
        expect(periodoLetivoPendente({ ...base, periodoLetivoAtual: '2027' })).toBeTrue();
    });

    it('não força o onboarding quando o servidor não informa o período letivo', () => {
        expect(periodoLetivoPendente(base)).toBeFalse();
    });
});
