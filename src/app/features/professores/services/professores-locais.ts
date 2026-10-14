// TEMPORÁRIO: remover este adaptador quando o catálogo local for substituído pelo Java.
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { PALETA_MATERIAS } from '../../../shared/utils/cores-materia';
import { CatalogoLocal, DadosLocaisError } from '../../dados-locais/models/catalogo-local';
import { DadosLocaisService } from '../../dados-locais/services/dados-locais.service';
import { validarCatalogo } from '../../dados-locais/services/validar-catalogo';
import { dataAcademica } from '../../dashboard/models/grade-dia.model';
import { RelogioService } from '../../salas/services/relogio';
import { predioDaSala } from '../../salas/services/localizacao-sala';
import { DIAS_SEMANA } from '../../horarios/models/item-horario';
import { paraDiaSemana } from '../../horarios/services/mapeadores-backend';
import { AulaProfessor, CursoProfessor, Professor } from '../models/professor';

/** Matriz semanal de todas as turmas do docente, independente das escolhas do aluno.
 * Feriados/reposições pertencem às consultas por data, não à matriz recorrente. */
export function aulasProfessoresLocais(c: CatalogoLocal, hoje: string): AulaProfessor[] {
    if (!c.vigenciaInicio || !c.vigenciaFim) {
        throw new DadosLocaisError('A agenda dos professores deste navegador está sem vigência confirmada.');
    }
    if (hoje < c.vigenciaInicio || hoje > c.vigenciaFim) return [];
    return c.alocacoes.flatMap(a => {
        if (a.professorId === null) return [];
        const oferta = c.ofertas.find(o => o.id === a.ofertaId)!;
        const disciplina = c.disciplinas.find(d => d.id === oferta.disciplinaId)!;
        const turma = c.turmas.find(t => t.id === oferta.turmaId)!;
        const curso = c.cursos.find(curso => curso.id === turma.cursoId)!;
        const sala = c.salas.find(s => s.id === a.salaId);
        const dia = a.diaSemana === 'DOMINGO' ? 'Domingo' : DIAS_SEMANA.find(d =>
            d.valor === paraDiaSemana(a.diaSemana))?.nome;
        if (!dia || !curso || curso.id !== disciplina.cursoId) {
            throw new DadosLocaisError('Não foi possível confirmar os vínculos da agenda deste navegador.');
        }
        const local = sala ? [sala.codigo, predioDaSala(sala.codigo)].filter(Boolean).join(' – ') : '';
        return [{ id: `local-${a.id}` as const, professorId: `local-${a.professorId}` as const,
            diaSemana: dia, inicio: a.horaInicio, termino: a.horaFim, disciplina: disciplina.nome,
            turma: turma.codigo, local, curso: { id: `local-${curso.id}` as const, nome: curso.nome },
            cor: PALETA_MATERIAS[(disciplina.id - 1) % PALETA_MATERIAS.length] }];
    });
}

@Injectable()
export class ProfessoresLocaisService {
    private readonly dados = inject(DadosLocaisService);
    private readonly erros = inject(ApiErrorService);
    private readonly relogio = inject(RelogioService);
    private geracao = 0;
    readonly professores = signal<Professor[]>([]);
    readonly cursos = signal<CursoProfessor[]>([]);
    readonly aulas = signal<AulaProfessor[]>([]);
    readonly carregando = signal(false);
    readonly erro = signal<string | null>(null);
    readonly erroAulas = signal<string | null>(null);

    constructor() { inject(DestroyRef).onDestroy(() => this.geracao++); }

    async carregar(): Promise<void> {
        const geracao = ++this.geracao;
        this.carregando.set(true);
        this.erro.set(null);
        this.erroAulas.set(null);
        this.professores.set([]);
        this.cursos.set([]);
        this.aulas.set([]);
        try {
            const salvo = await this.dados.catalogo();
            if (geracao !== this.geracao || !salvo) return;
            const c = validarCatalogo(salvo.catalogo);
            this.cursos.set(c.cursos.map(curso => ({ id: `local-${curso.id}`, nome: curso.nome.trim() })));
            this.professores.set(c.professores.map(p => ({
                id: `local-${p.id}`, idLocal: p.id, nome: p.nome.trim(), cargo: null,
            })));
            try {
                this.aulas.set(aulasProfessoresLocais(c, dataAcademica(this.relogio.agora())));
            } catch (erro) {
                this.erroAulas.set(this.erros.mensagem(erro, 'Não foi possível consultar as aulas deste navegador.'));
            }
        } catch (erro) {
            if (geracao === this.geracao) {
                this.erro.set(this.erros.mensagem(erro, 'Não foi possível consultar os professores deste navegador.'));
            }
        } finally {
            if (geracao === this.geracao) this.carregando.set(false);
        }
    }
}
