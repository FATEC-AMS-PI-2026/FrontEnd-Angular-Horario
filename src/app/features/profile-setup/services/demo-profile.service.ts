import { obterTokenSessao } from '../../../core/services/session.service';
/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend.
 * Dados e progresso locais para demonstrar primeiro acesso e reentrada sem API.
 */
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CursoDetalhes, Disciplina, PerfilResponse } from '../models/profile.model';

interface EstadoDemo {
    token: string;
    perfil: PerfilResponse;
    periodoConfirmado: boolean;
    disciplinasRascunho?: string[];
}

@Injectable({ providedIn: 'root' })
export class DemoProfileService {
    private readonly storageKey = 'gini_demo_perfil';
    readonly token = 'gini-demo-local-sem-validade-no-backend';
    readonly cursos: CursoDetalhes[] = [
        {
            id: 'demo-ads-manha', title: 'Análise e Desenvolvimento de Sistemas',
            period: 'Período: Manhã', unit: 'Fatec Itu', type: 'Tecnólogo', category: 'Manhã',
            icon: 'code', periodos: ['1º período', '2º período', '3º período', '4º período', '5º período', '6º período'],
            cargaHoraria: 2400, duracaoSemestres: 6, coordenador: null,
        },
        {
            id: 'demo-ads-tarde', title: 'Análise e Desenvolvimento de Sistemas',
            period: 'Período: Tarde (AMS)', unit: 'Fatec Itu', type: 'Tecnólogo', category: 'Tarde',
            icon: 'code', periodos: ['1º período', '2º período', '3º período', '4º período'],
            cargaHoraria: 2000, duracaoSemestres: 4, coordenador: null,
        },
    ];

    get habilitado(): boolean { return !environment.production && environment.demoAuth; }
    get sessaoDemonstrativa(): boolean { return obterTokenSessao() === this.token; }
    get ativo(): boolean { return this.habilitado && this.sessaoDemonstrativa; }

    iniciar(primeiroAcesso: boolean): PerfilResponse {
        const curso = this.cursos[0];
        const perfil: PerfilResponse = {
            usuario: {
                nome: primeiroAcesso ? 'Demonstração de primeiro acesso' : 'Demonstração de reentrada',
                email: primeiroAcesso ? 'primeiro@gini.local' : 'demo@gini.local',
                curso: primeiroAcesso ? '' : curso.title,
                periodo: primeiroAcesso ? '' : '2º período',
            },
            configuracaoInicialConcluida: !primeiroAcesso,
            cursoId: primeiroAcesso ? null : curso.id,
            disciplinasIds: primeiroAcesso ? [] : this.listarDisciplinas(curso.id)
                .filter(item => item.periodo === '2º período').map(item => item.id),
        };
        this.salvar({
            token: this.token, perfil, periodoConfirmado: false,
            disciplinasRascunho: [...perfil.disciplinasIds]
        });
        return perfil;
    }

    restaurar(): EstadoDemo {
        if (!this.ativo) throw new Error('Demonstração indisponível.');
        const estado: EstadoDemo | null = JSON.parse(localStorage.getItem(this.storageKey) ?? 'null');
        if (!estado || estado.token !== this.token || !estado.perfil?.usuario ||
            typeof estado.periodoConfirmado !== 'boolean') {
            throw new Error('Entre novamente na conta de demonstração.');
        }
        return estado;
    }

    escolher(cursoId: string | null, periodo: string | null): void {
        const estado = this.restaurar();
        if (estado.perfil.cursoId !== cursoId) estado.disciplinasRascunho = [];
        const curso = this.cursos.find(item => item.id === cursoId);
        estado.perfil = {
            ...estado.perfil, cursoId, usuario: {
                ...estado.perfil.usuario, curso: curso?.title ?? '', periodo: periodo ?? '',
            }
        };
        this.salvar(estado);
    }

    confirmar(cursoId: string | null, periodo: string | null): PerfilResponse {
        const curso = this.cursos.find(item => item.id === cursoId);
        if (!curso || !periodo || !curso.periodos.includes(periodo)) {
            throw new Error('Selecione um curso e período disponíveis.');
        }
        this.escolher(cursoId, periodo);
        const estado = this.restaurar();
        if (!estado.perfil.configuracaoInicialConcluida) {
            throw new Error('Conclua a seleção de disciplinas antes de entrar.');
        }
        estado.periodoConfirmado = true;
        this.salvar(estado);
        return estado.perfil;
    }

    listarDisciplinas(cursoId: string | null): Disciplina[] {
        const curso = this.cursos.find(item => item.id === cursoId);
        const nomes = [
            ['Algoritmos e lógica de programação', 'Matemática discreta', 'Comunicação e expressão'],
            ['Programação orientada a objetos', 'Banco de dados I', 'Engenharia de software I'],
            ['Estruturas de dados', 'Banco de dados II', 'Interação humano-computador'],
            ['Desenvolvimento web', 'Redes de computadores', 'Engenharia de software II'],
            ['Desenvolvimento para dispositivos móveis', 'Segurança da informação', 'Gestão de projetos'],
            ['Inteligência artificial', 'Sistemas distribuídos', 'Trabalho de graduação'],
        ];
        return curso?.periodos.flatMap((periodo, index) => nomes[index].map((nome, item) => ({
            id: `${curso.id}-${index + 1}-${item + 1}`, nome, periodo,
        }))) ?? [];
    }

    guardarDisciplinas(ids: string[]): void {
        const estado = this.restaurar();
        estado.disciplinasRascunho = [...ids];
        this.salvar(estado);
    }

    concluirGrade(cursoId: string | null, periodo: string | null, ids: string[]): PerfilResponse {
        const curso = this.cursos.find(item => item.id === cursoId);
        const catalogo = this.listarDisciplinas(cursoId);
        if (!curso || !periodo || !curso.periodos.includes(periodo) || !ids.length ||
            ids.some(id => !catalogo.some(item => item.id === id))) {
            throw new Error('Confira as disciplinas selecionadas.');
        }
        this.escolher(cursoId, periodo);
        const estado = this.restaurar();
        estado.perfil.disciplinasIds = [...new Set(ids)];
        estado.disciplinasRascunho = [...estado.perfil.disciplinasIds];
        estado.perfil.configuracaoInicialConcluida = true;
        estado.periodoConfirmado = true;
        this.salvar(estado);
        return estado.perfil;
    }

    private salvar(estado: EstadoDemo): void {
        localStorage.setItem(this.storageKey, JSON.stringify(estado));
    }
}
