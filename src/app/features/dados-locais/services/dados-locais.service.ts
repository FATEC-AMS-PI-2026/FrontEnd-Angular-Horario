import { obterTokenSessao } from '../../../core/services/session.service';
/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend Java.
 * Implementação exclusiva do armazenamento acadêmico e das contas locais no navegador.
 */
import { Injectable, inject } from '@angular/core';
import { BancoLocalService } from './banco-local.service';
import { validarCatalogo } from './validar-catalogo';
import { CatalogoLocal, CatalogoSalvo, DadosLocaisError, PerfilLocal } from '../models/catalogo-local';
import { CursoDetalhes, Disciplina, PerfilResponse } from '../../profile-setup/models/profile.model';
import { AlocacaoResponse, diaSemana } from '../../dashboard/models/grade-dia.model';

/** Fonte local independente do Java. Não autentica usuários nem armazena senhas. */
@Injectable({ providedIn: 'root' })
export class DadosLocaisService {
    private readonly banco = inject(BancoLocalService);
    private revisaoConsultada: string | null = null;
    readonly prefixo = 'gini-local:';
    get ativo(): boolean { return !!obterTokenSessao()?.startsWith(this.prefixo); }
    private get perfilId(): string {
        if (!this.ativo) throw new DadosLocaisError('Entre na sua conta para continuar.');
        return obterTokenSessao()!.slice(this.prefixo.length);
    }

    catalogo(): Promise<CatalogoSalvo | undefined> { return this.banco.ler('catalogo'); }
    async perfis(): Promise<PerfilLocal[]> { return await this.banco.ler<PerfilLocal[]>('perfis') ?? []; }

    async importar(valor: unknown): Promise<void> {
        const catalogo = validarCatalogo(valor);
        const salvo: CatalogoSalvo = { catalogo, revisao: crypto.randomUUID(), importadoEm: new Date().toISOString() };
        await this.banco.executar<void>('readwrite', store => { store.put(salvo, 'catalogo'); });
    }

    async criarPerfil(nome: string): Promise<PerfilLocal> {
        if (!nome.trim() || nome.trim().length > 100) throw new DadosLocaisError('Informe um nome de até 100 caracteres.');
        const perfil: PerfilLocal = {
            id: crypto.randomUUID(), nome: nome.trim(), cursoId: null,
            periodo: null, ofertasIds: [], revisao: null
        };
        await this.banco.executar<void>('readwrite', store => {
            const pedido = store.get('perfis');
            pedido.onsuccess = () => store.put([...(pedido.result as PerfilLocal[] ?? []), perfil], 'perfis');
        });
        return perfil;
    }

    private async contexto(): Promise<{ salvo: CatalogoSalvo; perfil: PerfilLocal }> {
        const id = this.perfilId;
        const contexto = await this.banco.executar<{ salvo?: CatalogoSalvo; perfis: PerfilLocal[] }>('readonly', (store, definir) => {
            const catalogo = store.get('catalogo');
            const perfis = store.get('perfis');
            perfis.onsuccess = () => definir({ salvo: catalogo.result, perfis: perfis.result ?? [] });
        });
        const perfil = contexto.perfis.find(item => item.id === id);
        if (!contexto.salvo) throw new DadosLocaisError('Não foi possível carregar a grade. Saia e entre novamente.');
        if (!perfil) throw new DadosLocaisError('Conta não encontrada neste navegador. Entre novamente.');
        return { salvo: contexto.salvo, perfil };
    }

    private resposta(perfil: PerfilLocal, salvo: CatalogoSalvo): PerfilResponse {
        const valido = perfil.revisao === salvo.revisao;
        const curso = salvo.catalogo.cursos.find(item => item.id === perfil.cursoId);
        return {
            usuario: {
                nome: perfil.nome, email: '', curso: valido ? curso?.nome ?? '' : '',
                periodo: valido && perfil.periodo ? `${perfil.periodo}º ${curso?.organizacao === 'Anual' ? 'ano' : 'período'}` : ''
            },
            cursoId: valido && curso ? String(curso.id) : null,
            disciplinasIds: valido ? perfil.ofertasIds.map(String) : [],
            configuracaoInicialConcluida: valido && !!curso && !!perfil.periodo && perfil.ofertasIds.length > 0,
        };
    }

    async carregarPerfil(): Promise<PerfilResponse> {
        const { perfil, salvo } = await this.contexto();
        return this.resposta(perfil, salvo);
    }

    async cursos(): Promise<CursoDetalhes[]> {
        const salvo = await this.catalogo();
        if (!salvo) throw new DadosLocaisError('Não foi possível carregar a grade. Saia e entre novamente.');
        return salvo.catalogo.cursos.map(c => ({
            id: String(c.id), title: c.nome, period: `Período: ${c.turno}`,
            unit: c.unidade, type: 'Tecnólogo', category: c.turno, icon: 'code',
            periodos: c.periodos.map(p => `${p}º ${c.organizacao === 'Anual' ? 'ano' : 'período'}`), cargaHoraria: c.cargaHoraria,
            duracaoAnos: c.organizacao === 'Anual' ? c.duracaoSemestres / 2 : undefined,
            duracaoSemestres: c.duracaoSemestres, coordenador: c.coordenador
        }));
    }

    async curso(id: string | null): Promise<CursoDetalhes> {
        const curso = (await this.cursos()).find(c => c.id === id);
        if (!curso) throw new DadosLocaisError('Curso não encontrado no catálogo local.');
        return curso;
    }

    async disciplinas(cursoId: string | null): Promise<Disciplina[]> {
        const salvo = await this.catalogo();
        if (!salvo) throw new DadosLocaisError('Não foi possível carregar a grade. Saia e entre novamente.');
        this.revisaoConsultada = salvo.revisao;
        const c = salvo.catalogo;
        return c.ofertas.flatMap(o => {
            const d = c.disciplinas.find(item => item.id === o.disciplinaId)!;
            const t = c.turmas.find(item => item.id === o.turmaId)!;
            const anual = c.cursos.find(curso => curso.id === d.cursoId)?.organizacao === 'Anual';
            return String(d.cursoId) === cursoId ? [{
                id: String(o.id),
                nome: `${d.nome} · ${t.codigo} (${t.turno})`, periodo: `${d.periodo}º ${anual ? 'ano' : 'período'}`
            }] : [];
        });
    }

    private validarEscolhas(c: CatalogoLocal, cursoId: number, periodo: number, ids: number[]): void {
        if (!c.cursos.some(curso => curso.id === cursoId && curso.periodos.includes(periodo)) || !ids.length) {
            throw new DadosLocaisError('Escolha o curso, o período e pelo menos uma disciplina.');
        }
        const disciplinas = new Set<number>();
        for (const id of ids) {
            const oferta = c.ofertas.find(o => o.id === id);
            const disciplina = c.disciplinas.find(d => d.id === oferta?.disciplinaId && d.cursoId === cursoId);
            if (!disciplina || disciplinas.has(disciplina.id)) {
                throw new DadosLocaisError('Selecione apenas uma turma por disciplina, dentro do seu curso.');
            }
            disciplinas.add(disciplina.id);
        }
        const aulas = c.alocacoes.filter(a => ids.includes(a.ofertaId));
        for (let i = 0; i < aulas.length; i++) for (let j = i + 1; j < aulas.length; j++) {
            const a = aulas[i], b = aulas[j];
            if (a.diaSemana === b.diaSemana && a.horaInicio < b.horaFim && b.horaInicio < a.horaFim) {
                throw new DadosLocaisError('Duas disciplinas escolhidas têm horários sobrepostos. Escolha outra turma.');
            }
        }
    }

    async salvar(cursoId: string | null, periodo: string | null, ids: string[], confirmar = false): Promise<PerfilResponse> {
        const { salvo, perfil } = await this.contexto();
        if ((confirmar && perfil.revisao !== salvo.revisao) ||
            (!confirmar && this.revisaoConsultada !== salvo.revisao)) {
            throw new DadosLocaisError('A grade foi atualizada. Saia e entre novamente para conferir suas disciplinas.');
        }
        const ofertasIds = [...new Set(ids.map(Number))];
        this.validarEscolhas(salvo.catalogo, Number(cursoId), Number.parseInt(periodo ?? '', 10), ofertasIds);
        const atualizado = { ...perfil, cursoId: Number(cursoId), periodo: Number.parseInt(periodo!, 10), ofertasIds, revisao: salvo.revisao };
        let mudou = false;
        await this.banco.executar<void>('readwrite', store => {
            const catalogo = store.get('catalogo');
            const perfis = store.get('perfis');
            perfis.onsuccess = () => {
                if (catalogo.result?.revisao !== salvo.revisao) { mudou = true; return; }
                store.put((perfis.result as PerfilLocal[]).map(p => p.id === perfil.id ? atualizado : p), 'perfis');
            };
        });
        if (mudou) throw new DadosLocaisError('O catálogo mudou durante a gravação. Confira sua grade novamente.');
        return this.resposta(atualizado, salvo);
    }

    async grade(data: string): Promise<AlocacaoResponse[]> {
        const { salvo, perfil } = await this.contexto();
        const c = salvo.catalogo;
        if (perfil.revisao !== salvo.revisao) throw new DadosLocaisError('A grade foi atualizada. Saia e entre novamente para revisar suas disciplinas.');
        if (!c.vigenciaInicio || !c.vigenciaFim) throw new DadosLocaisError('A grade está sem vigência confirmada. Aguarde a atualização dos horários.');
        if (data < c.vigenciaInicio || data > c.vigenciaFim) throw new DadosLocaisError('A data de hoje está fora da vigência da grade disponível.');
        this.validarEscolhas(c, perfil.cursoId!, perfil.periodo!, perfil.ofertasIds);
        if (c.calendario?.semAula.some(s => s.inicio <= data && data <= s.fim)) return [];
        return c.alocacoes.filter(a => {
            const oferta = c.ofertas.find(o => o.id === a.ofertaId)!;
            const turma = c.turmas.find(t => t.id === oferta.turmaId)!;
            const reposicao = c.calendario?.reposicoes.find(r => r.data === data && r.turno === turma.turno);
            return a.diaSemana === (reposicao?.diaSemana ?? diaSemana(data)) && perfil.ofertasIds.includes(a.ofertaId);
        }).map(a => {
            const oferta = c.ofertas.find(o => o.id === a.ofertaId)!;
            const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
            return {
                id: a.id, disciplina: c.disciplinas.find(d => d.id === oferta.disciplinaId)!,
                turma: c.turmas.find(t => t.id === oferta.turmaId)!,
                professor: c.professores.find(p => p.id === a.professorId) ?? null,
                sala: c.salas.find(s => s.id === a.salaId) ?? null, diaSemana: diaSemana(data),
                quadroHorario: c.quadroHorario,
                blocoHorario: { id: a.id, horaInicio: a.horaInicio, horaFim: a.horaFim, duracao: minutos(a.horaFim) - minutos(a.horaInicio) }
            };
        });
    }
}
