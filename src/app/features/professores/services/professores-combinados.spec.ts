import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { RelogioService } from '../../salas/services/relogio';
import { ProfessoresService } from './professores';
import { ProfessoresLocaisService } from './professores-locais';
import { fonteProfessoresLocaisTeste } from '../testing/professores-locais.fixture';
import { alocacaoApi, paginaApi, professorApi } from '../testing/professores-api.fixture';
import { paraAulaProfessor } from './mapeadores-professores';

describe('ProfessoresService: catálogo local junto ao Java', () => {
    let service: ProfessoresService;
    let http: HttpTestingController;
    let locais: ReturnType<typeof fonteProfessoresLocaisTeste>;
    const aulaLocal = (id = 1, nomeCurso = 'Curso local') => ({
        ...paraAulaProfessor(alocacaoApi(), '2026-10-13')!,
        id: `local-${id}` as const, professorId: 'local-1' as const,
        disciplina: 'Disciplina local', curso: { id: 'local-1' as const, nome: nomeCurso },
    });
    const cadastro = () => http.expectOne(r => r.url === '/api/professores');
    const grade = (id = 1) => http.expectOne(r => r.url === '/api/alocacoes' && r.params.get('id_usuario') === String(id));
    beforeEach(() => {
        locais = fonteProfessoresLocaisTeste();
        TestBed.configureTestingModule({ providers: [ProfessoresService, provideHttpClient(), provideHttpClientTesting(),
            { provide: ProfessoresLocaisService, useValue: locais },
            { provide: BACKEND_CONFIG, useValue: { url: '/api', modulos: ['professores', 'alocacoes', 'cursos'], agendaSalasCompleta: true } },
            { provide: RelogioService, useValue: { agora: () => new Date('2026-10-13T12:00:00Z') } },
        ] });
        service = TestBed.inject(ProfessoresService);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    it('mantém ambos os docentes com ID coincidente e nunca envia local-ID ao Java', () => {
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'Glauco Todesco', cargo: null }]);
        locais.aulas.set([aulaLocal()]);
        service.carregarProfessores();
        cadastro().flush(paginaApi([professorApi(1, 'Carlos')]));
        service.selecionarProfessor(1);
        grade().flush(paginaApi([]));
        expect(service.professoresFiltrados().map(p => p.nome)).toEqual(['Carlos', 'Glauco Todesco']);
        service.selecionarProfessor('local-1');
        http.expectNone(r => r.url === '/api/alocacoes');
        expect(service.diasAgrupados()[0].itens.length).toBe(1);
        service.selecionarCurso('local-1');
        expect(service.professoresFiltrados().map(p => p.nome)).toEqual(['Glauco Todesco']);
    });

    it('abre o docente solicitado pela origem e não troca um ausente pelo primeiro da lista (#170)', () => {
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'Docente local', cargo: null }]);
        locais.aulas.set([aulaLocal()]);
        service.abrirPelaRota('local-1');
        service.carregarProfessores();
        cadastro().flush(paginaApi([professorApi(1, 'Docente Java')]));
        expect(service.professorSelecionado()?.nome).toBe('Docente local');
        http.expectNone(r => r.url === '/api/alocacoes');
        service.abrirPelaRota('1');
        grade(1).flush(paginaApi([]));
        expect(service.professorSelecionado()?.nome).toBe('Docente Java');
        service.abrirPelaRota('local-99');
        expect(service.professorSelecionado()).toBeNull();
        expect(service.erroProfessorDaRota()).toContain('não está disponível');
        http.expectNone(r => r.url === '/api/alocacoes');
        service.abrirPelaRota('0');
        expect(service.erroProfessorDaRota()).toContain('Identificador inválido');
    });

    it('resolve entrada local pelo idLocal preservado ao combinar, sem usar coincidência numérica', () => {
        locais.professores.set([{ id: 'local-9', idLocal: 9, nome: 'Ana', cargo: null }]);
        service.abrirPelaRota('local-9');
        service.carregarProfessores();
        cadastro().flush(paginaApi([professorApi(2, 'Ana'), professorApi(9, 'Outra pessoa')]));
        grade(2).flush(paginaApi([]));
        expect(service.professorSelecionado()?.id).toBe(2);
        expect(service.professorSelecionado()?.idLocal).toBe(9);
    });

    it('informa indisponibilidade da fonte Java sem anunciar que o docente não existe', () => {
        TestBed.inject(BACKEND_CONFIG).modulos = [];
        service.abrirPelaRota('1');
        service.carregarProfessores();
        expect(service.erro()).toContain('ainda não está disponível');
        expect(service.erroProfessorDaRota()).toBeNull();
        expect(service.professorSelecionado()).toBeNull();
        http.expectNone(r => r.url === '/api/professores');
    });

    it('combina professor único pelo nome completo e prioriza Java nos intervalos sobrepostos', () => {
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'ANA', cargo: null }]);
        locais.aulas.set([aulaLocal(), { ...aulaLocal(2), inicio: '14:20', termino: '15:00' }]);
        service.carregarProfessores();
        cadastro().flush(paginaApi([professorApi(7, 'Ana')]));
        grade(7).flush(paginaApi([alocacaoApi(1, 7)]));
        expect(service.professoresFiltrados().length).toBe(1);
        expect(service.professorSelecionado()?.idLocal).toBe(1);
        const itens = service.diasAgrupados()[0].itens;
        expect(itens.filter(i => i.tipo === 'aula').map(i => i.aula.id)).toEqual([1, 'local-2']);
    });

    it('preserva docentes e aulas locais quando o servidor falha', () => {
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'Ana', cargo: null }]);
        locais.aulas.set([aulaLocal()]);
        service.carregarProfessores();
        cadastro().flush({}, { status: 500, statusText: 'Falha' });
        expect(service.erro()).toBeTruthy();
        expect(service.professorSelecionado()?.id).toBe('local-1');
        expect(service.diasAgrupados().length).toBe(1);
        service.carregarProfessores();
        cadastro().flush(paginaApi([professorApi(8, 'Ana')]));
        grade(8).flush({}, { status: 500, statusText: 'Falha' });
        expect(service.professorSelecionado()?.id).toBe(8);
        expect(service.diasAgrupados().length).toBe(1);
        expect(service.consultaAulasIncompleta()).toBeTrue();
    });

    it('combina cursos homônimos pelo nome completo e filtra aulas das duas fontes', () => {
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'Ana', cargo: null }]);
        locais.aulas.set([aulaLocal(1, 'ADS')]);
        service.carregarCursos();
        http.expectOne(r => r.url === '/api/cursos').flush(paginaApi([]));
        http.expectOne(r => !r.params.has('id_usuario')).flush(paginaApi([alocacaoApi()]));
        expect(service.cursos().map(c => c.id)).toEqual([1]);
        service.carregarProfessores();
        cadastro().flush(paginaApi([professorApi()]));
        grade().flush(paginaApi([]));
        service.selecionarCurso(1);
        grade().flush(paginaApi([]));
        expect(service.professoresFiltrados().length).toBe(1);
        expect(service.diasAgrupados().length).toBe(1);
    });

    it('não anuncia uma consulta completa enquanto o catálogo local carrega ou falha', () => {
        locais.carregando.set(true);
        service.carregarProfessores();
        cadastro().flush(paginaApi([professorApi()]));
        grade().flush(paginaApi([]));
        expect(service.carregando()).toBeTrue();
        expect(service.consultaAulasIncompleta()).toBeTrue();
        locais.carregando.set(false);
        locais.erro.set('Falha de leitura local');
        expect(service.professoresFiltrados().length).toBe(1);
        expect(service.consultaAulasIncompleta()).toBeTrue();
        locais.erro.set(null);
        expect(service.consultaAulasIncompleta()).toBeFalse();
    });
});
