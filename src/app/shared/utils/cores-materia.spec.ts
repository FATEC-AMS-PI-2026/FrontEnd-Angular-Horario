import { atribuirCores, embaralhar, PALETA_MATERIAS } from './cores-materia';

describe('cores-materia', () => {
    it('embaralhar mantém os mesmos elementos e não altera a lista original', () => {
        const original = [...PALETA_MATERIAS];
        const embaralhada = embaralhar(PALETA_MATERIAS);

        expect([...embaralhada].sort()).toEqual([...original].sort());
        expect([...PALETA_MATERIAS]).toEqual(original);
    });

    it('embaralhar usa a função aleatória recebida', () => {
        // Sempre 0 → cada posição troca com a primeira: [a, b, c] vira [b, c, a].
        expect(embaralhar(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
    });

    it('atribuirCores dá a mesma cor para a mesma matéria e cores diferentes para matérias diferentes', () => {
        const cores = atribuirCores(['BD', 'PI', 'BD', 'IHC'], ['azul', 'verde', 'roxo']);

        expect(cores.get('BD')).toBe('azul');
        expect(cores.get('PI')).toBe('verde');
        expect(cores.get('IHC')).toBe('roxo');
        expect(cores.size).toBe(3);
    });

    it('atribuirCores recomeça a paleta quando há mais matérias que cores', () => {
        const cores = atribuirCores(['A', 'B', 'C'], ['azul', 'verde']);
        expect(cores.get('C')).toBe('azul');
    });
});
