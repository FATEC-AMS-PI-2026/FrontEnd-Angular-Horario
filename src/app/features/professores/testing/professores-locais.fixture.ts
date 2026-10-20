import { signal } from '@angular/core';
import { AulaProfessor, CursoProfessor, Professor } from '../models/professor';

/** Fonte controlada em testes de combinação/HTTP; não lê nem escreve no IndexedDB real. */
export function fonteProfessoresLocaisTeste() {
    return {
        professores: signal<Professor[]>([]),
        cursos: signal<CursoProfessor[]>([]),
        aulas: signal<AulaProfessor[]>([]),
        carregando: signal(false),
        erro: signal<string | null>(null),
        erroAulas: signal<string | null>(null),
        carregar: () => Promise.resolve(),
    };
}
