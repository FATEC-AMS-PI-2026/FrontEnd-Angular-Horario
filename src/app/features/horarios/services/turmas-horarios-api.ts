import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, defer, expand, map, reduce, throwError } from 'rxjs';
import { BACKEND_CONFIG, BackendIndisponivelError } from '../../../core/services/backend-config';
import { AulaHorario, ItemHorario } from '../models/item-horario';
import { Turma } from '../models/turma';
import { comIntervalos, ler, ordenarTurmas, paraAulaHorario, paraTurma, quadroAtivo, turmasDasAlocacoes } from './mapeadores-backend';

/** Limite por requisição; todas as páginas são lidas antes de publicar o resultado. */
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

interface PaginaApi { content: unknown[]; page: number; totalPages: number; }

/**
 * Turmas de um curso e horários de cada turma vindos do backend Java (#150).
 * Base para a Grade Semanal (#110), Horários e Dashboard; os erros HTTP seguem
 * para quem chamar, que decide a mensagem (ver `ApiErrorService`).
 */
@Injectable({ providedIn: 'root' })
export class TurmasHorariosApiService {
    private readonly http = inject(HttpClient);
    private readonly config = inject(BACKEND_CONFIG);
    private readonly baseUrl = this.config.url.replace(/\/+$/, '');

    private consultarTodas(rota: string, filtros: Record<string, number> = {}): Observable<unknown[]> {
        return defer(() => {
            if (!this.config.habilitado && !(this.config.modulos ?? []).includes(rota)) {
                return throwError(() => new BackendIndisponivelError('Consulta ao backend não habilitada.'));
            }
            let totalEsperado: number | undefined;
            const pagina = (page: number) => this.http.get<unknown>(`${this.baseUrl}/${rota}`, {
                params: { ...filtros, page, size: TAMANHO_PAGINA },
            }).pipe(map(resposta => {
                const content = ler(resposta, 'content');
                const numero = ler(resposta, 'page');
                const totalPages = ler(resposta, 'totalPages');
                if (!Array.isArray(content) || numero !== page || typeof totalPages !== 'number' ||
                    !Number.isSafeInteger(totalPages) || totalPages < 0 ||
                    (totalPages === 0 ? page !== 0 || content.length > 0 : page >= totalPages) ||
                    (page + 1 < totalPages && !content.length) ||
                    (totalEsperado !== undefined && totalPages !== totalEsperado)) {
                    throw new Error('Paginação incompleta de turmas ou horários.');
                }
                totalEsperado = totalPages;
                return { content, page, totalPages } as PaginaApi;
            }));
            return pagina(0).pipe(
                expand(p => p.page + 1 < p.totalPages ? pagina(p.page + 1) : EMPTY, 1),
                map(p => p.content),
                reduce((todos, itens) => todos.concat(itens), [] as unknown[]),
            );
        });
    }

    /**
     * Turmas do curso (ex.: ADS), opcionalmente de um ano letivo e período, ordenadas.
     * Se `/turmas` falhar no servidor (no PostgreSQL ele dá 500 por um bug do
     * backend com filtro vazio), as turmas são deduzidas de `/alocacoes`.
     */
    listarTurmasDoCurso(cursoId: number, filtro: { ano?: number; periodo?: number } = {}): Observable<Turma[]> {
        if (!Number.isSafeInteger(cursoId) || cursoId <= 0 ||
            [filtro.ano, filtro.periodo].some(valor =>
                valor !== undefined && (!Number.isSafeInteger(valor) || valor <= 0))) {
            return throwError(() => new Error('Curso, ano ou período inválido.'));
        }
        const params: Record<string, number> = { [CONTRATO.turmas.filtroCurso]: cursoId };
        if (filtro.ano !== undefined) params['ano'] = filtro.ano;
        if (filtro.periodo !== undefined) params['periodo'] = filtro.periodo;
        return this.consultarTodas(CONTRATO.turmas.rota, params).pipe(
            map(registros => {
                const porId = new Map<number, Turma>();
                for (const registro of registros) {
                    const status = ler(ler(registro, 'curso'), 'status');
                    if (typeof status === 'string' && status !== 'ATIVO') continue;
                    const turma = paraTurma(registro);
                    if (!turma) throw new Error('Cadastro de turma inválido.');
                    if (turma.cursoId !== cursoId ||
                        (filtro.ano !== undefined && turma.ano !== filtro.ano) ||
                        (filtro.periodo !== undefined && turma.periodo !== filtro.periodo)) continue;
                    porId.set(turma.id, turma);
                }
                return ordenarTurmas([...porId.values()]);
            }),
            catchError((erro: unknown) => erro instanceof HttpErrorResponse && erro.status >= 500
                ? this.turmasPelasAlocacoes(cursoId, filtro)
                : throwError(() => erro)),
        );
    }

    private turmasPelasAlocacoes(cursoId: number, filtro: { ano?: number; periodo?: number }): Observable<Turma[]> {
        return this.consultarTodas(CONTRATO.alocacoes.rota).pipe(
            map(alocacoes => turmasDasAlocacoes(alocacoes, cursoId, filtro)),
        );
    }

    /** Aulas da turma no quadro ativo, já com os intervalos, no formato da tela de Horários. */
    listarHorariosDaTurma(turmaId: number): Observable<ItemHorario[]> {
        if (!Number.isSafeInteger(turmaId) || turmaId <= 0) {
            return throwError(() => new Error('Turma inválida.'));
        }
        const params = { [CONTRATO.alocacoes.filtroTurma]: turmaId };
        return this.consultarTodas(CONTRATO.alocacoes.rota, params).pipe(
            map(alocacoes => comIntervalos(alocacoes
                .filter(alocacao => ler(ler(alocacao, 'turma'), 'id') === turmaId)
                .filter(quadroAtivo)
                .map(paraAulaHorario)
                .filter((aula): aula is AulaHorario => aula !== null))),
        );
    }
}
