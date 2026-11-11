import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

const CHAVE = 'gini_preferencias';
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

interface Preferencias {
    /** `null` enquanto o usuário não escolheu o tema no GINI: segue o sistema (#163). */
    temaManual: boolean | null;
    notificacoes: boolean;
}

/**
 * Tema e notificações. Sem escolha manual, o tema acompanha `prefers-color-scheme`,
 * inclusive quando o sistema muda com a página aberta. Depois que o usuário liga ou
 * desliga o modo escuro, essa escolha fica salva e vale mesmo se o sistema mudar.
 * O primeiro tema é aplicado já no `index.html`, antes do Angular, com a mesma regra.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
    private readonly document = inject(DOCUMENT);
    private readonly preferencias = this.restaurar();
    private readonly sistema = this.document.defaultView?.matchMedia?.(CONSULTA_ESCURO) ?? null;
    private temaManual = this.preferencias.temaManual;
    private readonly escuro = signal(this.temaManual ?? this.sistema?.matches ?? false);
    private readonly avisos = signal(this.preferencias.notificacoes);
    readonly modoEscuro = this.escuro.asReadonly();
    readonly notificacoes = this.avisos.asReadonly();
    readonly erroPersistencia = signal('');

    constructor() {
        this.aplicarTema();
        const aoMudarSistema = (evento: MediaQueryListEvent) => {
            if (this.temaManual !== null) return;
            this.escuro.set(evento.matches);
            this.aplicarTema();
        };
        this.sistema?.addEventListener('change', aoMudarSistema);
        inject(DestroyRef).onDestroy(() => this.sistema?.removeEventListener('change', aoMudarSistema));
    }

    definirModoEscuro(ativo: boolean): void {
        this.temaManual = ativo;
        this.escuro.set(ativo);
        this.aplicarTema();
        this.salvar();
    }

    definirNotificacoes(ativo: boolean): void {
        this.avisos.set(ativo);
        this.salvar();
    }

    private aplicarTema(): void {
        this.document.documentElement.setAttribute('data-theme', this.modoEscuro() ? 'dark' : 'light');
    }

    private salvar(): void {
        try {
            // Só grava o tema quando ele foi escolhido; mexer nas notificações não fixa o tema.
            const tema = this.temaManual === null ? {} : { modoEscuro: this.temaManual, temaManual: true };
            localStorage.setItem(CHAVE, JSON.stringify({ ...tema, notificacoes: this.notificacoes() }));
            this.erroPersistencia.set('');
        } catch {
            this.erroPersistencia.set('Não foi possível salvar as preferências neste navegador.');
        }
    }

    private restaurar(): Preferencias {
        try {
            const valor: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
            if (valor && typeof valor === 'object') {
                const escuro = 'modoEscuro' in valor && valor.modoEscuro === true;
                // Antes da #163 o `modoEscuro: false` era salvo junto com as notificações sem o
                // usuário escolher; só `true` (precisava ligar o botão) conta como escolha antiga.
                const manual = ('temaManual' in valor && valor.temaManual === true) || escuro;
                return {
                    temaManual: manual ? escuro : null,
                    notificacoes: !('notificacoes' in valor) || valor.notificacoes !== false,
                };
            }
        } catch {
            // Preferências inválidas usam os valores padrão.
        }
        return { temaManual: null, notificacoes: true };
    }
}
