import { TestBed } from '@angular/core/testing';
import { DadosLocaisService } from '../../dados-locais/services/dados-locais.service';
import { CatalogoSalvo, DadosLocaisError } from '../../dados-locais/models/catalogo-local';
import { RelogioService } from '../../salas/services/relogio';
import { catalogoSalaLocal } from '../../salas/testing/catalogo-local.fixture';
import { ProfessoresLocaisService, aulasProfessoresLocais } from './professores-locais';
import { PALETA_MATERIAS } from '../../../shared/utils/cores-materia';

describe('ProfessoresLocaisService', () => {
    let service: ProfessoresLocaisService;
    let ler: jasmine.Spy;
    const salvo = (): CatalogoSalvo => ({ catalogo: catalogoSalaLocal(), revisao: 'teste', importadoEm: '2026-10-13' });
    beforeEach(() => {
        ler = jasmine.createSpy('catalogo').and.resolveTo(salvo());
        TestBed.configureTestingModule({ providers: [ProfessoresLocaisService,
            { provide: DadosLocaisService, useValue: { catalogo: ler } },
            { provide: RelogioService, useValue: { agora: () => new Date('2026-10-13T12:00:00Z') } },
        ] });
        service = TestBed.inject(ProfessoresLocaisService);
    });

    it('consulta o catálogo salvo sem gravar e obtém todas as turmas, sem depender da seleção do aluno', async () => {
        const carga = service.carregar();
        expect(service.carregando()).toBeTrue();
        await carga;
        expect(ler).toHaveBeenCalledTimes(1);
        expect(service.professores()).toEqual([{ id: 'local-1', idLocal: 1, nome: 'Docente local', cargo: null }]);
        expect(service.aulas()[0]).toEqual({
            id: 'local-1', professorId: 'local-1', diaSemana: 'Segunda-feira', inicio: '13:00', termino: '14:00',
            disciplina: 'Disciplina local', turma: 'Turma local', local: 'LAB 01 – Prédio 1',
            curso: { id: 'local-1', nome: 'Curso de teste' }, cor: 'verde',
        });
        expect(service.carregando()).toBeFalse();
    });

    it('inclui cadastro sem aulas e não inventa docentes para alocações sem professor', async () => {
        const s = salvo();
        s.catalogo.professores.push({ id: 2, nome: 'Sem aulas' });
        s.catalogo.alocacoes[0].professorId = null;
        ler.and.resolveTo(s);
        await service.carregar();
        expect(service.professores().length).toBe(2);
        expect(service.cursos()).toEqual([{ id: 'local-1', nome: 'Curso de teste' }]);
        expect(service.aulas()).toEqual([]);
        expect(service.erro()).toBeNull();
    });

    it('usa a mesma paleta ampliada nas aulas do catálogo salvo', () => {
        const cores = PALETA_MATERIAS.map((_, indice) => {
            const catalogo = catalogoSalaLocal();
            catalogo.disciplinas[0].id = indice + 1;
            catalogo.ofertas[0].disciplinaId = indice + 1;
            return aulasProfessoresLocais(catalogo, '2026-10-13')[0].cor;
        });
        expect(new Set(cores).size).toBe(PALETA_MATERIAS.length);
        expect(cores).toEqual([...PALETA_MATERIAS]);
    });

    it('distingue catálogo ausente de falha de leitura e preserva mensagem segura do banco', async () => {
        ler.and.resolveTo(undefined);
        await service.carregar();
        expect(service.erro()).toBeNull();
        expect(service.professores()).toEqual([]);
        ler.and.rejectWith(new DadosLocaisError('Outra aba está bloqueando o banco.'));
        await service.carregar();
        expect(service.erro()).toBe('Outra aba está bloqueando o banco.');
        ler.and.resolveTo(salvo());
        await service.carregar();
        expect(service.erro()).toBeNull();
        expect(service.professores().length).toBe(1);
    });

    it('mantém o cadastro e informa agenda incompleta quando não há vigência confirmada', async () => {
        const s = salvo();
        s.catalogo.vigenciaInicio = null;
        s.catalogo.vigenciaFim = null;
        ler.and.resolveTo(s);
        await service.carregar();
        expect(service.professores().length).toBe(1);
        expect(service.erro()).toBeNull();
        expect(service.erroAulas()).toContain('vigência');
    });

    it('respeita vigência sem aplicar feriados/reposições à matriz semanal', () => {
        const c = catalogoSalaLocal();
        c.calendario = { semAula: [{ inicio: '2026-10-13', fim: '2026-10-13', motivo: 'Feriado' }], reposicoes: [] };
        expect(aulasProfessoresLocais(c, '2026-10-13').length).toBe(1);
        expect(aulasProfessoresLocais(c, '2027-01-01')).toEqual([]);
    });

    it('ignora leituras substituídas e respostas que chegam depois de sair da página', async () => {
        let primeira!: (valor: CatalogoSalvo) => void;
        let ultima!: (valor: CatalogoSalvo) => void;
        ler.and.returnValues(new Promise<CatalogoSalvo>(r => primeira = r), Promise.resolve(undefined),
            new Promise<CatalogoSalvo>(r => ultima = r));
        const antiga = service.carregar();
        await service.carregar();
        primeira(salvo());
        await antiga;
        expect(service.professores()).toEqual([]);
        const pendente = service.carregar();
        TestBed.resetTestingModule();
        ultima(salvo());
        await pendente;
        expect(service.professores()).toEqual([]);
    });
});
