import { Injectable } from '@angular/core';
import { obterTokenSessao } from '../../../core/services/session.service';
import { AulaHorario } from '../../horarios/models/item-horario';
import { LinhaGrade } from '../../horarios/models/grade-semanal';

interface ContextoGrade { bloco: string; aula: string; tabela: number; pagina: number; sessao: string | null; }

function chaveAula(aula: AulaHorario): string {
    return JSON.stringify([aula.diaSemana, aula.inicio, aula.termino, aula.materia, aula.professor, aula.sala,
        ...[aula.referencias?.materia, aula.referencias?.professor, aula.referencias?.sala]
            .map(r => r ? [r.origem, r.id] : null)]);
}

/** Guarda somente o contexto de navegação em memória, sem escrever na grade ou no perfil. */
@Injectable({ providedIn: 'root' })
export class ContextoGradeService {
    private contexto?: ContextoGrade;

    guardar(bloco: string, aula: AulaHorario, tabela: number, pagina: number): void {
        this.contexto = { bloco, aula: chaveAula(aula), tabela, pagina, sessao: obterTokenSessao() };
    }

    consumir(linhas: LinhaGrade[]): ContextoGrade | undefined {
        const contexto = this.contexto;
        this.contexto = undefined;
        if (!contexto || contexto.sessao !== obterTokenSessao()) return undefined;
        const aula = linhas.flatMap(l => l.celulas.filter(a => a && `${a.diaSemana}:${l.inicio}` === contexto.bloco))
            .find(a => a && chaveAula(a) === contexto.aula);
        return aula ? contexto : undefined;
    }
}
