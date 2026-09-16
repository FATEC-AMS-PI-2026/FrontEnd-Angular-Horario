import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, map, throwError } from 'rxjs';
import { AlocacaoResponse, diaSemana } from '../models/grade-dia.model';

/** O adaptador deverá retornar todas as alocações vigentes do aluno autenticado
 * para a data solicitada, já resolvendo turma, versão do quadro e paginação.
 * Não usar /alocacoes?usuario=aluno: o Java filtra professor nesse parâmetro.
 */
export type CarregarGradeDia = (data: string) => Observable<AlocacaoResponse[]>;
export const CARREGAR_GRADE_DIA = new InjectionToken<CarregarGradeDia>('CARREGAR_GRADE_DIA');

export class GradeIndisponivelError extends Error { }

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly carregar = inject(CARREGAR_GRADE_DIA, { optional: true });

    carregarDia(data: string): Observable<AlocacaoResponse[]> {
        // Integração pendente: não consultar uma grade global nem gerar aulas fictícias.
        if (!this.carregar) return throwError(() => new GradeIndisponivelError());
        return defer(() => this.carregar!(data)).pipe(map(alocacoes => {
            const horario = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
            if (!Array.isArray(alocacoes) || alocacoes.some(item =>
                !item || !Number.isSafeInteger(item.id) || !item.disciplina?.nome ||
                !Number.isSafeInteger(item.professor?.id) || !item.professor.nome ||
                !Number.isSafeInteger(item.sala?.id) || !item.sala.codigo ||
                item.diaSemana !== diaSemana(data) ||
                !horario.test(item.blocoHorario?.horaInicio) || !horario.test(item.blocoHorario?.horaFim) ||
                item.blocoHorario.horaInicio >= item.blocoHorario.horaFim)) {
                throw new Error('Resposta da grade inválida.');
            }
            if (new Set(alocacoes.map(item => item.id)).size !== alocacoes.length) {
                throw new Error('Alocações duplicadas na grade.');
            }
            return [...alocacoes].sort((a, b) =>
                a.blocoHorario.horaInicio.localeCompare(b.blocoHorario.horaInicio) || a.id - b.id);
        }));
    }
}
