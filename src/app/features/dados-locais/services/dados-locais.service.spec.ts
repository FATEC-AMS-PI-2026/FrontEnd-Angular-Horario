/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend Java.
 * Implementação exclusiva do armazenamento acadêmico e das contas locais no navegador.
 */
import { TestBed } from '@angular/core/testing';
import { DadosLocaisService } from './dados-locais.service';
import { BancoLocalService, NOME_BANCO_LOCAL } from './banco-local.service';
import { CatalogoLocal } from '../models/catalogo-local';
import { validarCatalogo } from './validar-catalogo';

describe('Dados locais: IndexedDB real no navegador', () => {
    let dados: DadosLocaisService;
    let nomeBanco: string;
    const catalogo = (): CatalogoLocal => ({
        versao: 1, titulo: 'Catálogo de teste', atualizadoEm: '2026-09-16',
        vigenciaInicio: '2026-02-09', vigenciaFim: '2026-12-14', quadroHorario: { id: 1, versao: 1 },
        cursos: [{
            id: 1, nome: 'ADS', organizacao: 'Anual', turno: 'Tarde', unidade: 'Fatec',
            periodos: [1, 2], cargaHoraria: null, duracaoSemestres: 4, coordenador: null
        }],
        disciplinas: [{ id: 1, nome: 'Disciplina A', cursoId: 1, periodo: 1 },
        { id: 2, nome: 'Disciplina B', cursoId: 1, periodo: 1 }],
        professores: [], salas: [],
        turmas: [{ id: 1, codigo: 'ADS1', periodo: 1, ano: 2026, cursoId: 1, turno: 'Tarde' }],
        ofertas: [{ id: 1, disciplinaId: 1, turmaId: 1 }, { id: 2, disciplinaId: 2, turmaId: 1 }],
        alocacoes: [
            { id: 1, ofertaId: 1, professorId: null, salaId: null, diaSemana: 'SEGUNDA', horaInicio: '13:20', horaFim: '14:10' },
            { id: 2, ofertaId: 2, professorId: null, salaId: null, diaSemana: 'SEGUNDA', horaInicio: '14:10', horaFim: '15:00' },
        ],
        calendario: {
            semAula: [{ inicio: '2026-09-07', fim: '2026-09-07', motivo: 'Feriado' }],
            reposicoes: [{ data: '2026-09-19', diaSemana: 'SEGUNDA', turno: 'Tarde' }]
        },
    });
    beforeEach(() => {
        nomeBanco = 'gini-teste-' + crypto.randomUUID();
        TestBed.configureTestingModule({ providers: [{ provide: NOME_BANCO_LOCAL, useValue: nomeBanco }] });
        dados = TestBed.inject(DadosLocaisService);
        localStorage.removeItem('gini_token');
    });
    afterEach(async () => {
        localStorage.removeItem('gini_token');
        await new Promise<void>((resolve, reject) => {
            const pedido = indexedDB.deleteDatabase(nomeBanco);
            pedido.onsuccess = () => resolve(); pedido.onerror = () => reject(pedido.error);
        });
    });
    async function preparar(nome = 'Ana'): Promise<void> {
        await dados.importar(catalogo());
        const perfil = await dados.criarPerfil(nome);
        localStorage.setItem('gini_token', dados.prefixo + perfil.id);
        await dados.disciplinas('1');
        await dados.salvar('1', '1º ano', ['1', '2']);
    }

    it('persiste catálogo e escolhas e separa perfis sem senha', async () => {
        await preparar();
        const token = localStorage.getItem('gini_token')!;
        expect((await dados.curso('1')).periodos).toEqual(['1º ano', '2º ano']);
        expect((await dados.curso('1')).duracaoAnos).toBe(2);
        localStorage.removeItem('gini_token');
        expect((await dados.perfis()).length).toBe(1);
        localStorage.setItem('gini_token', token);
        expect((await dados.carregarPerfil()).disciplinasIds).toEqual(['1', '2']);
        const outra = await dados.criarPerfil('Bia');
        localStorage.setItem('gini_token', dados.prefixo + outra.id);
        expect((await dados.carregarPerfil()).configuracaoInicialConcluida).toBeFalse();
        expect((await dados.carregarPerfil()).disciplinasIds).toEqual([]);
        expect(JSON.stringify(await dados.catalogo())).not.toContain('Ana');
    });

    it('aplica seleção do aluno, feriados e compensações sem inventar professor ou sala', async () => {
        await preparar();
        await dados.salvar('1', '1º ano', ['1']);
        const segunda = await dados.grade('2026-09-14');
        expect(segunda.length).toBe(1);
        expect(segunda[0].professor).toBeNull();
        expect(segunda[0].sala).toBeNull();
        expect(await dados.grade('2026-09-07')).toEqual([]);
        const sabado = await dados.grade('2026-09-19');
        expect(sabado.length).toBe(1);
        expect(sabado[0].diaSemana).toBe('SABADO');
        expect(await dados.grade('2026-09-20')).toEqual([]);
        await expectAsync(dados.grade('2027-01-01')).toBeRejected();
    });

    it('não substitui catálogo válido por arquivo inválido e exige revisão após importação', async () => {
        await preparar();
        const antes = await dados.catalogo();
        const invalido = catalogo(); invalido.alocacoes[0].salaId = 999;
        await expectAsync(dados.importar(invalido)).toBeRejected();
        expect((await dados.catalogo())?.revisao).toBe(antes?.revisao);
        await dados.importar(catalogo());
        expect((await dados.carregarPerfil()).configuracaoInicialConcluida).toBeFalse();
        await expectAsync(dados.grade('2026-09-14')).toBeRejected();
        await expectAsync(dados.salvar('1', '1º ano', ['1'])).toBeRejected();
        await dados.disciplinas('1');
        await dados.salvar('1', '1º ano', ['1']);
        expect((await dados.carregarPerfil()).configuracaoInicialConcluida).toBeTrue();
    });

    it('impede escolher duas turmas da mesma disciplina ou aulas sobrepostas entre turmas', async () => {
        const c = catalogo();
        c.turmas.push({ ...c.turmas[0], id: 2, codigo: 'ADS2' });
        c.ofertas.push({ id: 3, disciplinaId: 1, turmaId: 2 });
        c.alocacoes.push({ ...c.alocacoes[1], id: 3, ofertaId: 3 });
        await dados.importar(c);
        const perfil = await dados.criarPerfil('Ana');
        localStorage.setItem('gini_token', dados.prefixo + perfil.id);
        await dados.disciplinas('1');
        await expectAsync(dados.salvar('1', '1º ano', ['1', '3'])).toBeRejected();
        await expectAsync(dados.salvar('1', '1º ano', ['2', '3'])).toBeRejected();
        expect((await dados.carregarPerfil()).configuracaoInicialConcluida).toBeFalse();
        await dados.salvar('1', '1º ano', ['3']);
        expect((await dados.carregarPerfil()).disciplinasIds).toEqual(['3']);
    });

    it('aborta todas as gravações de uma transação com falha', async () => {
        const banco = TestBed.inject(BancoLocalService);
        await expectAsync(banco.executar('readwrite', store => {
            store.put({ valor: 1 }, 'teste');
            throw new Error('Interrupção de teste');
        })).toBeRejected();
        expect(await banco.ler('teste')).toBeUndefined();
    });

    it('rejeita IDs repetidos, formatos incompatíveis, conflitos e horários inválidos', () => {
        expect(() => validarCatalogo({ versao: 2 })).toThrow();
        const a = catalogo(); a.disciplinas.push(a.disciplinas[0]);
        expect(() => validarCatalogo(a)).toThrow();
        const b = catalogo(); b.alocacoes[1].horaInicio = '13:50';
        expect(() => validarCatalogo(b)).toThrow();
        const c = catalogo(); c.alocacoes[0].horaFim = '25:00';
        expect(() => validarCatalogo(c)).toThrow();
    });

    it('permite consultar referência, mas não a apresenta como grade vigente', async () => {
        const c = catalogo(); c.vigenciaInicio = null; c.vigenciaFim = null;
        await dados.importar(c);
        const perfil = await dados.criarPerfil('Ana');
        localStorage.setItem('gini_token', dados.prefixo + perfil.id);
        await dados.disciplinas('1');
        await dados.salvar('1', '1º ano', ['1']);
        await expectAsync(dados.grade('2026-09-14')).toBeRejected();
        expect((await dados.catalogo())?.catalogo.alocacoes.length).toBe(2);
    });
});
