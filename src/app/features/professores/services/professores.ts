import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, Subscription, defer, expand, map, reduce, throwError } from 'rxjs';
import { BACKEND_CONFIG, BackendIndisponivelError } from '../../../core/services/backend-config';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { paginaDaApi, ler } from '../../../shared/utils/resposta-api';
import { dataAcademica } from '../../dashboard/models/grade-dia.model';
import { RelogioService } from '../../salas/services/relogio';
import { AulaProfessor, CursoProfessor, IdCursoProfessor, IdProfessor, Professor } from '../models/professor';
import { ProfessorApi } from '../models/professor-api';
import { agruparAulasProfessor, idDaApi, paraAulaProfessor, paraCursoProfessor, paraProfessor } from './mapeadores-professores';
import { nomeCompletoProfessor, unirAulasProfessores, unirCursosProfessores, unirProfessores } from './combinar-professores';
import { referenciaDaRota } from '../../../shared/models/referencia-academica';
// TEMPORÁRIO: remover o complemento do catálogo quando sua substituição pelo Java estiver concluída.
import { ProfessoresLocaisService } from './professores-locais';

/** Instância por página: as consultas são canceladas ao sair de Professores. */
@Injectable()
export class ProfessoresService {
    private readonly http = inject(HttpClient);
    private readonly config = inject(BACKEND_CONFIG);
    private readonly erros = inject(ApiErrorService);
    private readonly relogio = inject(RelogioService);
    private readonly base = this.config.url.replace(/\/+$/, '');
    private readonly locais = inject(ProfessoresLocaisService);
    private consultaLista?: Subscription;
    private consultaCursos?: Subscription;
    private consultaCatalogoCursos?: Subscription;
    private consultaAulas?: Subscription;
    private destruido = false;
    private readonly cadastroJava = signal<Professor[]>([]);
    private readonly cursosDaAgenda = signal<AulaProfessor[]>([]);
    private readonly catalogoCursosJava = signal<CursoProfessor[]>([]);
    private readonly aulasJava = signal<AulaProfessor[]>([]);
    private readonly selecionadoId = signal<IdProfessor | null>(null);
    private nomeSelecionado = '';
    private nomeCursoSelecionado = '';
    private cursoDaConsulta: IdCursoProfessor | null = null;
    private readonly nome = signal('');
    private readonly parametroProfessor = signal<string | null>(null);
    readonly entradaPorRota = this.parametroProfessor.asReadonly();
    private readonly curso = signal<IdCursoProfessor | null>(null);
    private readonly carregandoJava = signal(false);
    private readonly carregandoCursosJava = signal(false);
    private readonly carregandoCatalogoCursos = signal(false);
    private readonly carregandoAulasJava = signal(false);

    readonly erro = signal<string | null>(null);
    readonly erroCursos = signal<string | null>(null);
    readonly erroCatalogoCursos = signal<string | null>(null);
    readonly erroAulas = signal<string | null>(null);
    readonly erroLocal = this.locais.erro;
    readonly erroAulasLocais = this.locais.erroAulas;
    readonly carregando = computed(() => this.carregandoJava() || this.locais.carregando());
    readonly carregandoCursos = computed(() => this.carregandoCursosJava() || this.carregandoCatalogoCursos() || this.locais.carregando());
    readonly carregandoAulas = computed(() => this.carregandoAulasJava() || this.locais.carregando());
    /** Confirma que /alocacoes não está restrito a um curso do usuário. */
    readonly agendaCompleta = this.config.agendaSalasCompleta === true;
    readonly termoBusca = this.nome.asReadonly();
    readonly cursoSelecionado = this.curso.asReadonly();
    private readonly cadastro = computed(() => unirProfessores(this.cadastroJava(), this.locais.professores()));
    private readonly indiceCursos = computed(() => unirCursosProfessores(
        [...this.catalogoCursosJava(), ...this.cursosDaAgenda().map(a => a.curso)],
        [...this.locais.cursos(), ...this.locais.aulas().map(a => a.curso)]));
    readonly cursos = computed(() => this.indiceCursos().cursos);
    readonly professoresFiltrados = computed(() => {
        const nome = nomeCompletoProfessor(this.nome()), curso = this.curso();
        const ids = new Set<IdProfessor>();
        if (curso !== null) {
            this.cursosDaAgenda().filter(a => a.curso.id === curso).forEach(a => ids.add(a.professorId));
            this.locais.aulas().filter(a => this.indiceCursos().ids.get(a.curso.id) === curso).forEach(a => {
                const p = this.cadastro().find(p => p.idLocal !== undefined && a.professorId === `local-${p.idLocal}`);
                if (p) ids.add(p.id);
            });
        }
        return this.cadastro().filter(p => nomeCompletoProfessor(p.nome).includes(nome) &&
            (curso === null || ids.has(p.id)));
    });
    readonly professorSelecionado = computed(() =>
        this.professoresFiltrados().find(p => p.id === this.selecionadoId()) ?? null);
    readonly erroProfessorDaRota = computed(() => {
        const parametro = this.parametroProfessor();
        if (parametro === null) return null;
        const referencia = referenciaDaRota(parametro);
        if (!referencia) return 'Professor não encontrado. Identificador inválido.';
        if (this.professorDaRota()) return null;
        if (referencia.origem === 'local' ? this.locais.carregando() || this.erroLocal()
            : this.carregandoJava() || this.erro()) return null;
        return 'O professor solicitado não está disponível no cadastro consultado.';
    });
    private readonly aulas = computed(() => {
        const professor = this.professorSelecionado();
        if (!professor) return [];
        const locais = this.locais.aulas().filter(a => professor.idLocal !== undefined &&
            a.professorId === `local-${professor.idLocal}`);
        const java = typeof professor.id === 'number' ? this.aulasJava() : [];
        // A grade específica pode ser conhecida mesmo quando o índice remoto de cursos falhou.
        const cursos = unirCursosProfessores(
            [...this.cursosDaAgenda(), ...java].map(a => a.curso), this.locais.aulas().map(a => a.curso));
        const escolhido = this.curso();
        const canonical = (id: IdCursoProfessor) => cursos.ids.get(id) ?? id;
        const filtrar = (a: AulaProfessor) => escolhido === null || canonical(a.curso.id) === canonical(escolhido);
        return unirAulasProfessores(java.filter(filtrar), locais.filter(filtrar));
    });
    readonly diasAgrupados = computed(() => agruparAulasProfessor(this.aulas()));
    readonly consultaAulasIncompleta = computed(() =>
        this.carregandoAulas() || !!this.erroAulas() || !!this.erroLocal() || !!this.erroAulasLocais());

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            this.destruido = true;
            this.consultaLista?.unsubscribe();
            this.consultaCursos?.unsubscribe();
            this.consultaCatalogoCursos?.unsubscribe();
            this.consultaAulas?.unsubscribe();
        });
    }

    private consultarTodas<T = unknown>(rota: string, filtros: Record<string, number> = {}): Observable<T[]> {
        return defer(() => {
            if (!this.config.habilitado && !(this.config.modulos ?? []).includes(rota)) {
                return throwError(() => new BackendIndisponivelError('Esta consulta ainda não está disponível.'));
            }
            let totalEsperado: number | undefined;
            const pagina = (page: number) => this.http.get<unknown>(`${this.base}/${rota}`, {
                params: { ...filtros, page, size: 200 },
            }).pipe(map(resposta => {
                const p = paginaDaApi(resposta, page, totalEsperado);
                totalEsperado = p.totalPages;
                return p;
            }));
            return pagina(0).pipe(
                expand(p => p.page + 1 < p.totalPages ? pagina(p.page + 1) : EMPTY, 1),
                map(p => p.content),
                reduce((todos, itens) => todos.concat(itens), [] as unknown[]),
                map(itens => {
                    const ids = itens.map(item => idDaApi(ler(item, 'id')));
                    if (new Set(ids).size !== ids.length) throw new Error('Registros duplicados na consulta.');
                    return itens as T[];
                }),
            );
        });
    }

    carregar(): void {
        this.carregarLocais();
        this.carregarProfessores();
        this.carregarCursos();
    }

    /** TEMPORÁRIO: lê somente o catálogo já salvo; não importa dados nem modifica contas/grade. */
    carregarLocais(): void {
        void this.locais.carregar().then(() => {
            if (!this.destruido && !this.locais.carregando()) this.reconciliarSelecao();
        });
    }

    carregarProfessores(): void {
        this.consultaLista?.unsubscribe();
        this.cadastroJava.set([]);
        this.reconciliarSelecao();
        this.carregandoJava.set(true);
        this.erro.set(null);
        this.consultaLista = this.consultarTodas<ProfessorApi>('professores').pipe(
            map(itens => itens.map(paraProfessor)),
        ).subscribe({
            next: professores => {
                this.cadastroJava.set(professores);
                this.carregandoJava.set(false);
                this.reconciliarSelecao();
            },
            error: erro => {
                this.erro.set(this.erros.mensagem(erro, 'Não foi possível carregar os professores do servidor.'));
                this.carregandoJava.set(false);
            },
        });
    }

    carregarCursos(): void {
        this.carregarCatalogoCursos();
        this.consultaCursos?.unsubscribe();
        this.cursosDaAgenda.set([]);
        this.curso.set(null);
        this.reconciliarSelecao();
        this.erroCursos.set(null);
        if (!this.agendaCompleta) return;
        this.carregandoCursosJava.set(true);
        const hoje = dataAcademica(this.relogio.agora());
        this.consultaCursos = this.consultarTodas('alocacoes').pipe(
            map(itens => itens.map(item => paraAulaProfessor(item, hoje)).filter((a): a is AulaProfessor => a !== null)),
            map(aulas => {
                const nomes = new Map<IdCursoProfessor, string>();
                for (const aula of aulas) {
                    if (nomes.has(aula.curso.id) && nomes.get(aula.curso.id) !== aula.curso.nome) {
                        throw new Error('Cursos inconsistentes na consulta.');
                    }
                    nomes.set(aula.curso.id, aula.curso.nome);
                }
                return aulas;
            }),
        ).subscribe({
            next: aulas => {
                this.cursosDaAgenda.set(aulas);
                this.carregandoCursosJava.set(false);
                this.reconciliarSelecao();
            },
            error: erro => {
                this.erroCursos.set(this.erros.mensagem(erro, 'Não foi possível consultar os cursos dos professores do servidor.'));
                this.carregandoCursosJava.set(false);
            },
        });
    }

    carregarCatalogoCursos(): void {
        this.consultaCatalogoCursos?.unsubscribe();
        this.carregandoCatalogoCursos.set(true);
        this.erroCatalogoCursos.set(null);
        this.consultaCatalogoCursos = this.consultarTodas('cursos').pipe(
            map(itens => itens.map(paraCursoProfessor)),
        ).subscribe({
            next: cursos => {
                this.catalogoCursosJava.set(cursos);
                this.carregandoCatalogoCursos.set(false);
                this.reconciliarSelecao();
            },
            error: erro => {
                this.erroCatalogoCursos.set(this.erros.mensagem(erro, 'Não foi possível carregar os cursos do servidor.'));
                this.carregandoCatalogoCursos.set(false);
            },
        });
    }

    abrirPelaRota(parametro: string | null): void {
        this.parametroProfessor.set(parametro);
        if (parametro !== null) { this.nome.set(''); this.curso.set(null); }
        this.reconciliarSelecao();
    }

    private professorDaRota(): Professor | undefined {
        const referencia = referenciaDaRota(this.parametroProfessor());
        if (!referencia) return undefined;
        const candidatos = this.cadastro().filter(p => referencia.origem === 'local'
            ? p.idLocal === referencia.id || p.id === `local-${referencia.id}` : p.id === referencia.id);
        return candidatos.length === 1 ? candidatos[0] : undefined;
    }

    buscar(nome: string): void { this.parametroProfessor.set(null); this.nome.set(nome); this.reconciliarSelecao(); }
    selecionarCurso(id: IdCursoProfessor | null): void {
        if (id !== null && !this.cursos().some(c => c.id === id)) return;
        this.parametroProfessor.set(null);
        this.curso.set(id);
        this.nomeCursoSelecionado = this.cursos().find(c => c.id === this.curso())?.nome ?? '';
        this.reconciliarSelecao();
    }
    selecionarProfessor(id: IdProfessor): void {
        const professor = this.professoresFiltrados().find(p => p.id === id);
        if (professor) this.parametroProfessor.set(null);
        if (id === this.selecionadoId() || !professor) return;
        this.selecionadoId.set(id);
        this.nomeSelecionado = professor.nome;
        this.carregarAulas();
    }

    private reconciliarSelecao(): void {
        const curso = this.curso();
        if (curso !== null && !this.cursos().some(c => c.id === curso)) {
            const candidatos = this.cursos().filter(c => nomeCompletoProfessor(c.nome) === nomeCompletoProfessor(this.nomeCursoSelecionado));
            this.curso.set(candidatos.length === 1 ? candidatos[0].id : null);
        }
        const lista = this.professoresFiltrados();
        const nomes = lista.filter(p => nomeCompletoProfessor(p.nome) === nomeCompletoProfessor(this.nomeSelecionado));
        const professor = this.parametroProfessor() !== null ? this.professorDaRota()
            : lista.find(p => p.id === this.selecionadoId()) ?? (nomes.length === 1 ? nomes[0] : lista[0]);
        const id = professor?.id ?? null;
        this.nomeSelecionado = professor?.nome ?? '';
        if (id !== this.selecionadoId() || this.cursoDaConsulta !== this.curso()) {
            this.selecionadoId.set(id);
            this.carregarAulas();
        }
    }

    carregarAulas(): void {
        this.consultaAulas?.unsubscribe();
        this.aulasJava.set([]);
        this.erroAulas.set(null);
        this.carregandoAulasJava.set(false);
        const id = this.selecionadoId();
        this.cursoDaConsulta = this.curso();
        // IDs locais jamais são enviados como IDs de Professor ao Java.
        if (typeof id !== 'number') return;
        this.carregandoAulasJava.set(true);
        const hoje = dataAcademica(this.relogio.agora());
        this.consultaAulas = this.consultarTodas('alocacoes', { id_usuario: id }).pipe(
            map(itens => itens.map(item => paraAulaProfessor(item, hoje, id))
                .filter((a): a is AulaProfessor => a !== null)),
        ).subscribe({
            next: aulas => { this.aulasJava.set(aulas); this.carregandoAulasJava.set(false); },
            error: erro => {
                this.erroAulas.set(this.erros.mensagem(erro, 'Não foi possível carregar as aulas deste professor no servidor.'));
                this.carregandoAulasJava.set(false);
            },
        });
    }
}
