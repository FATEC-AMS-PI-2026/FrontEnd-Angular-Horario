import { AulaProfessor, CursoProfessor, IdCursoProfessor, Professor } from '../models/professor';

/** Nome completo, sem aproximação por iniciais, primeiro nome ou IDs de outra fonte. */
export const nomeCompletoProfessor = (nome: string) => nome.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

function ocorrencias<T extends { nome: string }>(itens: T[]): Map<string, T[]> {
    const nomes = new Map<string, T[]>();
    itens.forEach(item => {
        const nome = nomeCompletoProfessor(item.nome);
        nomes.set(nome, [...(nomes.get(nome) ?? []), item]);
    });
    return nomes;
}

/** Java prevalece numa correspondência única; homônimos permanecem separados. */
export function unirProfessores(java: Professor[], locais: Professor[]): Professor[] {
    const nomesJava = ocorrencias(java), nomesLocais = ocorrencias(locais);
    const usados = new Set<Professor>();
    const remotos = java.map(p => {
        const nome = nomeCompletoProfessor(p.nome), candidatos = nomesLocais.get(nome) ?? [];
        if (nomesJava.get(nome)?.length !== 1 || candidatos.length !== 1) return p;
        usados.add(candidatos[0]);
        return { ...p, idLocal: candidatos[0].idLocal };
    });
    return [...remotos, ...locais.filter(p => !usados.has(p))]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || String(a.id).localeCompare(String(b.id)));
}

/** Curso identificado pela fonte e pelo nome completo; não equiparar ADS e ADS AMS. */
export function unirCursosProfessores(java: CursoProfessor[], locais: CursoProfessor[]) {
    const unicos = (itens: CursoProfessor[]) => [...new Map(itens.map(c => [c.id, c])).values()];
    const remotos = unicos(java), internos = unicos(locais);
    const nomesJava = ocorrencias(remotos), nomesLocais = ocorrencias(internos);
    const ids = new Map<IdCursoProfessor, IdCursoProfessor>();
    remotos.forEach(c => ids.set(c.id, c.id));
    const adicionais: CursoProfessor[] = [];
    internos.forEach(c => {
        const nome = nomeCompletoProfessor(c.nome), candidatos = nomesJava.get(nome) ?? [];
        if (nomesLocais.get(nome)?.length === 1 && candidatos.length === 1) ids.set(c.id, candidatos[0].id);
        else { ids.set(c.id, c.id); adicionais.push(c); }
    });
    return { ids, cursos: [...remotos, ...adicionais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) };
}

/** Mesma prioridade usada nas salas: Java ocupa seus intervalos; local complementa os demais. */
export function unirAulasProfessores(java: AulaProfessor[], locais: AulaProfessor[]): AulaProfessor[] {
    return [...java, ...locais.filter(l => !java.some(j => j.diaSemana === l.diaSemana &&
        j.inicio < l.termino && l.inicio < j.termino))];
}
