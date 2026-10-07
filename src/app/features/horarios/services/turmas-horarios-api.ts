import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { AulaHorario, ItemHorario } from '../models/item-horario';
import { Turma } from '../models/turma';
import { comIntervalos, ler, ordenarTurmas, paraAulaHorario, paraTurma, quadroAtivo } from './mapeadores-backend';

/** O backend pagina por padrão (10 itens); como as telas não paginam, pedimos tudo de uma vez. */
const TAMANHO_PAGINA = 200;

/**
 * Rotas e nomes de filtro do contrato atual (`dev` do backend). Na branch
 * `enhancement/motor-grade` os filtros viram `curso_id`/`turma_id` e os
 * horários da turma ganham rota própria (`/motor-quadro/cursos/{id}/turmas/{id}`,
 * que os mapeadores já sabem ler). Trocar só aqui quando ela for mergeada.
 */
const CONTRATO = {
    turmas: { rota: 'turmas', filtroCurso: 'curso' },
    alocacoes: { rota: 'alocacoes', filtroTurma: 'turma' },
} as const;

function conteudo(pagina: unknown): unknown[] {
    const itens = ler(pagina, 'content');
    return Array.isArray(itens) ? itens : [];
}

/**
 * Turmas de um curso e horários de cada turma vindos do backend Java (#150).
 * Base para a Grade Semanal (#110), Horários e Dashboard; os erros HTTP seguem
 * para quem chamar, que decide a mensagem (ver `ApiErrorService`).
 */
@Injectable({ providedIn: 'root' })
export class TurmasHorariosApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(BACKEND_CONFIG).url.replace(/\/+$/, '');

    /** Turmas do curso (ex.: ADS), opcionalmente de um ano letivo e período, ordenadas. */
    listarTurmasDoCurso(cursoId: number, filtro: { ano?: number; periodo?: number } = {}): Observable<Turma[]> {
        const params: Record<string, number> = { [CONTRATO.turmas.filtroCurso]: cursoId, page: 0, size: TAMANHO_PAGINA };
        if (filtro.ano !== undefined) params['ano'] = filtro.ano;
        if (filtro.periodo !== undefined) params['periodo'] = filtro.periodo;
        return this.http.get<unknown>(`${this.baseUrl}/${CONTRATO.turmas.rota}`, { params }).pipe(
            map(pagina => ordenarTurmas(conteudo(pagina)
                .map(paraTurma)
                .filter((turma): turma is Turma => turma !== null))),
        );
    }

    /** Aulas da turma no quadro ativo, já com os intervalos, no formato da tela de Horários. */
    listarHorariosDaTurma(turmaId: number): Observable<ItemHorario[]> {
        const params = { [CONTRATO.alocacoes.filtroTurma]: turmaId, page: 0, size: TAMANHO_PAGINA };
        return this.http.get<unknown>(`${this.baseUrl}/${CONTRATO.alocacoes.rota}`, { params }).pipe(
            map(pagina => comIntervalos(conteudo(pagina)
                .filter(quadroAtivo)
                .map(paraAulaHorario)
                .filter((aula): aula is AulaHorario => aula !== null))),
        );
    }
}
