import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { defer, Subscription, take, throwError } from 'rxjs';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { obterTokenSessao } from '../../../core/services/session.service';
import { atribuirCores, embaralhar, PALETA_MATERIAS } from '../../../shared/utils/cores-materia';
import { AlocacaoResponse, diaSemana } from '../../dashboard/models/grade-dia.model';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import { intervalosDaGrade } from '../../dashboard/models/intervalos-grade';
import { AulaGrade, DiaGrade, LinhaGrade } from '../models/grade-semanal';
import { AulaHorario, BlocoHorario, DiaSemana, DIAS_SEMANA, ItemHorario, NovaAula, ResultadoAdicao } from '../models/item-horario';
import { CARREGAR_GRADE_SEMANAL, GradeSemanalIndisponivelError } from './grade-semanal-source';

const DIA_DA_ALOCACAO: Partial<Record<AlocacaoResponse['diaSemana'], DiaSemana>> = {
    SEGUNDA: 'seg', TERCA: 'ter', QUARTA: 'qua', QUINTA: 'qui', SEXTA: 'sex', SABADO: 'sab',
};

/** Texto exibido quando a matéria adicionada ainda não tem professor/sala conhecidos. */
export const A_DEFINIR = 'A definir';

@Injectable({ providedIn: 'root' })
export class HorariosService {
    private readonly fonte = inject(CARREGAR_GRADE_SEMANAL, { optional: true });
    private readonly erros = inject(ApiErrorService);
    private readonly gradeDiaria = inject(DashboardService);
    private readonly destroyRef = inject(DestroyRef);
    private pedido?: Subscription;
    private pedidoDia?: Subscription;
    private sessaoConsultada: string | null = null;
    private assinaturaGrade: string | null = null;
    private readonly aulasAdicionadas = signal<AulaHorario[]>([]);
    private readonly aulas = signal<AulaHorario[]>([]);
    private readonly aulasDia = signal<AulaHorario[]>([]);
    private readonly dataDia = signal('');
    private readonly paleta = signal(embaralhar(PALETA_MATERIAS));

    readonly carregando = signal(false);
    readonly carregado = signal(false);
    readonly erro = signal<string | null>(null);
    readonly carregandoDia = signal(false);
    readonly carregadoDia = signal(false);
    readonly erroDia = signal<string | null>(null);

    /** Aulas e lacunas reais de cada dia, sem intervalos fixos. */
    readonly itens = computed<ItemHorario[]>(() => DIAS_SEMANA.flatMap(dia =>
        this.comIntervalos(this.aulas().filter(aula => aula.diaSemana === dia.valor), dia.valor)));

    /** Agenda da data selecionada em Horários; não altera a matriz recorrente. */
    readonly itensDia = computed<ItemHorario[]>(() => {
        if (!this.carregadoDia()) return [];
        const dia = DIA_DA_ALOCACAO[diaSemana(this.dataDia())];
        if (!dia) return [];
        return this.comIntervalos([...this.aulasDia(),
            ...this.aulasAdicionadas().filter(aula => aula.diaSemana === dia)], dia);
    });

    private comIntervalos(aulas: AulaHorario[], dia: DiaSemana): ItemHorario[] {
        const lacunas = intervalosDaGrade(aulas.map(aula => ({
            blocoHorario: { horaInicio: aula.inicio, horaFim: aula.termino },
        })));
        return [...aulas, ...lacunas.map(lacuna => ({
            tipo: 'intervalo' as const, diaSemana: dia,
            inicio: lacuna.horaInicio.slice(0, 5), termino: lacuna.horaFim.slice(0, 5),
        }))].sort((a, b) => a.inicio.localeCompare(b.inicio));
    }

    carregarDia(data: string): void {
        this.pedidoDia?.unsubscribe();
        const sessao = obterTokenSessao();
        this.dataDia.set(data);
        this.carregandoDia.set(true);
        this.carregadoDia.set(false);
        this.erroDia.set(null);
        this.aulasDia.set([]);
        const falhar = (error: unknown) => {
            this.carregandoDia.set(false);
            this.carregadoDia.set(false);
            this.aulasDia.set([]);
            this.erroDia.set(this.erros.mensagem(error, 'Não foi possível carregar seus horários. Tente novamente.'));
        };
        this.pedidoDia = this.gradeDiaria.carregarDia(data).pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: alocacoes => {
                    if (obterTokenSessao() !== sessao) { falhar(new Error('Sessão alterada.')); return; }
                    try {
                        this.aulasDia.set(this.mapear(alocacoes));
                        this.carregadoDia.set(true);
                        this.carregandoDia.set(false);
                    } catch (error) { falhar(error); }
                },
                error: falhar,
                complete: () => {
                    if (this.carregandoDia()) falhar(new Error('A fonte não retornou os horários.'));
                },
            });
    }

    /** A página cancela a consulta diária ao sair; inclusões da #104 permanecem em memória. */
    cancelarDia(): void {
        this.pedidoDia?.unsubscribe();
        this.aulasDia.set([]);
        this.carregadoDia.set(false);
        this.carregandoDia.set(false);
        this.erroDia.set(null);
    }

    readonly materias = computed(() =>
        [...new Set(this.aulas().map(aula => aula.materia))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    );

    readonly blocos = computed<BlocoHorario[]>(() => {
        const blocos = new Map<string, BlocoHorario>();
        for (const aula of this.aulas()) {
            blocos.set(`${aula.inicio}-${aula.termino}`, { inicio: aula.inicio, termino: aula.termino });
        }
        return [...blocos.values()].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.termino.localeCompare(b.termino));
    });

    /** Segunda a sexta sempre presentes; sábado acompanha as alocações. */
    readonly dias = computed<DiaGrade[]>(() => DIAS_SEMANA
        .filter(dia => dia.valor !== 'sab' || this.aulas().some(aula => aula.diaSemana === 'sab'))
        .map(dia => ({ valor: dia.valor, nome: dia.nome.replace('-feira', '') })),
    );

    private readonly aulasColoridas = computed<AulaGrade[]>(() => {
        const cores = atribuirCores(this.aulas().map(aula => aula.materia), this.paleta());
        return this.aulas().map(aula => ({ ...aula, cor: cores.get(aula.materia)! }));
    });

    /** Usa todas as fronteiras dos blocos para não perder aulas de durações distintas. */
    readonly linhas = computed<LinhaGrade[]>(() => {
        const aulas = this.aulasColoridas();
        const limites = [...new Set(aulas.flatMap(aula => [aula.inicio, aula.termino]))].sort();
        return limites.slice(0, -1).map((inicio, indice) => {
            const termino = limites[indice + 1];
            const celulas = this.dias().map(dia => aulas.find(aula =>
                aula.diaSemana === dia.valor && aula.inicio <= inicio && termino <= aula.termino) ?? null);
            return { inicio, termino, intervalo: celulas.every(celula => celula === null), celulas };
        });
    });

    /** Reconsulta as escolhas persistidas a cada entrada na página e nova tentativa. */
    carregar(): void {
        const sessao = obterTokenSessao();
        if (this.carregando() && this.sessaoConsultada === sessao) return;
        this.pedido?.unsubscribe();
        if (this.sessaoConsultada !== sessao) {
            this.aulasAdicionadas.set([]);
            this.assinaturaGrade = null;
        }
        this.sessaoConsultada = sessao;
        this.carregando.set(true);
        this.carregado.set(false);
        this.erro.set(null);
        this.aulas.set([]);
        // Mantém a regra da #115: sorteio por carregamento, estável nas interações.
        this.paleta.set(embaralhar(PALETA_MATERIAS));
        this.pedido = defer(() => this.fonte ? this.fonte()
            : throwError(() => new GradeSemanalIndisponivelError()))
            .pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
                next: alocacoes => {
                    if (obterTokenSessao() !== sessao) { this.sessaoMudou(); return; }
                    try {
                        const aulas = this.mapear(alocacoes);
                        const assinatura = JSON.stringify(alocacoes.map(a => a.id).sort((a, b) => a - b))
                            + JSON.stringify(aulas);
                        // A #104 mantém inclusões em memória entre as duas telas enquanto a
                        // grade salva é a mesma; trocar escolhas/conta descarta essas inclusões.
                        if (assinatura !== this.assinaturaGrade) this.aulasAdicionadas.set([]);
                        this.assinaturaGrade = assinatura;
                        this.aulas.set([...aulas, ...this.aulasAdicionadas()]);
                        this.carregado.set(true);
                        this.carregando.set(false);
                    } catch (error) { this.falhar(error); }
                },
                error: error => obterTokenSessao() === sessao ? this.falhar(error) : this.sessaoMudou(),
                complete: () => {
                    if (this.carregando()) this.falhar(new Error('A fonte não retornou a grade.'));
                },
            });
    }

    private sessaoMudou(): void {
        this.falhar(new Error('Sessão alterada.'));
    }

    private falhar(error: unknown): void {
        this.aulas.set([]);
        this.carregando.set(false);
        this.carregado.set(false);
        this.erro.set(error instanceof GradeSemanalIndisponivelError
            ? 'A grade semanal ainda não está disponível para esta conta.'
            : this.erros.mensagem(error, 'Não foi possível carregar sua grade semanal. Tente novamente.'));
    }

    private mapear(alocacoes: AlocacaoResponse[]): AulaHorario[] {
        const horario = /^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/;
        if (!Array.isArray(alocacoes) || alocacoes.some(a => !a || !Number.isSafeInteger(a.id)
            || !a.disciplina?.nome?.trim() || !DIA_DA_ALOCACAO[a.diaSemana]
            || !horario.test(a.blocoHorario?.horaInicio) || !horario.test(a.blocoHorario?.horaFim)
            || a.blocoHorario.horaInicio.slice(0, 5) >= a.blocoHorario.horaFim.slice(0, 5))
            || new Set(alocacoes.map(a => a.id)).size !== alocacoes.length) {
            throw new Error('Resposta da grade semanal inválida.');
        }
        const aulas = alocacoes.map<AulaHorario>(a => ({
            tipo: 'aula', diaSemana: DIA_DA_ALOCACAO[a.diaSemana]!,
            inicio: a.blocoHorario.horaInicio.slice(0, 5), termino: a.blocoHorario.horaFim.slice(0, 5),
            materia: a.disciplina.nome, professor: a.professor?.nome?.trim() || '',
            sala: a.sala?.codigo?.trim() || '',
            ...(a.reposicao ? { reposicao: a.reposicao } : {}),
        })).sort((a, b) => DIAS_SEMANA.findIndex(dia => dia.valor === a.diaSemana)
            - DIAS_SEMANA.findIndex(dia => dia.valor === b.diaSemana) || a.inicio.localeCompare(b.inicio));
        for (let i = 1; i < aulas.length; i++) {
            const anterior = aulas[i - 1], atual = aulas[i];
            if (anterior.diaSemana === atual.diaSemana && atual.inicio < anterior.termino) {
                throw new Error('Alocações sobrepostas na grade semanal.');
            }
        }
        return aulas;
    }

    /** Mantém a inclusão em memória da #104; a persistência depende de contrato próprio. */
    adicionarAula(nova: NovaAula): ResultadoAdicao {
        if (!this.carregado() || this.sessaoConsultada !== obterTokenSessao()) {
            return { ok: false, erro: 'Carregue sua grade antes de adicionar uma aula.' };
        }
        const ocupado = [...this.aulas(), ...this.aulasDia()].some(aula => aula.diaSemana === nova.diaSemana
            && aula.inicio < nova.bloco.termino && nova.bloco.inicio < aula.termino);
        if (ocupado) return { ok: false, erro: 'Já existe uma aula nesse dia e horário.' };
        const referencia = this.aulas().find(aula => aula.materia === nova.materia);
        const adicionada: AulaHorario = {
            tipo: 'aula', diaSemana: nova.diaSemana, inicio: nova.bloco.inicio, termino: nova.bloco.termino,
            materia: nova.materia, professor: referencia?.professor || A_DEFINIR, sala: referencia?.sala || A_DEFINIR,
        };
        this.aulasAdicionadas.update(aulas => [...aulas, adicionada]);
        this.aulas.update(aulas => [...aulas, adicionada]);
        return { ok: true };
    }
}
