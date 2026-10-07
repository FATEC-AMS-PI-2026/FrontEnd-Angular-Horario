import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AlocacaoResponse } from '../../dashboard/models/grade-dia.model';

/** Todas as alocações recorrentes escolhidas pelo aluno autenticado.
 * O adaptador Java deverá resolver o perfil/ofertas; /alocacoes?usuario filtra professor. */
export type CarregarGradeSemanal = () => Observable<AlocacaoResponse[]>;
export const CARREGAR_GRADE_SEMANAL = new InjectionToken<CarregarGradeSemanal>('CARREGAR_GRADE_SEMANAL');
export class GradeSemanalIndisponivelError extends Error { }
