/**
 * Cores disponíveis para cards de matéria. Cada nome corresponde a um trio de
 * tokens `--tag-<cor>-bg/-fg/-border` em `styles/_tokens.scss`, que já têm
 * contraste conferido nos temas claro e escuro. Amarelo e vermelho ficam de
 * fora porque o Dashboard usa essas cores para intervalo e alerta.
 */
export const PALETA_MATERIAS = ['verde', 'azul', 'ciano', 'roxo', 'rosa', 'magenta', 'indigo'] as const;

export type CorMateria = (typeof PALETA_MATERIAS)[number];

/** Cópia embaralhada da lista (Fisher–Yates). `aleatorio` é injetável para os testes. */
export function embaralhar<T>(lista: readonly T[], aleatorio: () => number = Math.random): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(aleatorio() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/**
 * Distribui as cores de `paleta` entre as matérias, na ordem em que aparecem.
 * Matérias repetidas recebem a mesma cor (para a tela continuar legível);
 * se houver mais matérias que cores, a paleta recomeça do início.
 *
 * A cor não fica presa à matéria: quem chama passa uma paleta embaralhada a
 * cada carregamento da tela (issues #113 e #115).
 */
export function atribuirCores(materias: readonly string[], paleta: readonly CorMateria[]): Map<string, CorMateria> {
    const cores = new Map<string, CorMateria>();
    for (const materia of materias) {
        if (!cores.has(materia)) {
            cores.set(materia, paleta[cores.size % paleta.length]);
        }
    }
    return cores;
}
