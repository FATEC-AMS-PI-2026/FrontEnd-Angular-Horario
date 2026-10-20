import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BACKEND_CONFIG, BackendConfig } from '../../../core/services/backend-config';
import { backendInterceptor } from '../../../core/services/backend.interceptor';
import { RelogioService } from '../../salas/services/relogio';
import { ProfessoresService } from './professores';
import { ProfessoresLocaisService } from './professores-locais';
import { fonteProfessoresLocaisTeste } from '../testing/professores-locais.fixture';
import { alocacaoApi, paginaApi, professorApi } from '../testing/professores-api.fixture';

describe('ProfessoresService', () => {
    let service: ProfessoresService;
    let http: HttpTestingController;
    let config: BackendConfig;
    const lista = [professorApi(1, 'Ana'), professorApi(2, 'Zélia'), professorApi(3, 'Sem aulas')];
    const grade = (id = 1) => http.expectOne(r => r.url === '/api/alocacoes' && r.params.get('id_usuario') === String(id));
    const cursos = () => http.expectOne(r => r.url === '/api/alocacoes' && !r.params.has('id_usuario'));
    const cadastro = (page = 0) => http.expectOne(r => r.url === '/api/professores' && r.params.get('page') === String(page));

    beforeEach(() => {
        config = { url: '/api', habilitado: false, modulos: ['professores', 'alocacoes', 'cursos'], agendaSalasCompleta: true };
        TestBed.configureTestingModule({ providers: [
            ProfessoresService, { provide: ProfessoresLocaisService, useValue: fonteProfessoresLocaisTeste() }, provideHttpClient(withInterceptors([backendInterceptor])), provideHttpClientTesting(),
            { provide: BACKEND_CONFIG, useValue: config },
            { provide: RelogioService, useValue: { agora: () => new Date('2026-10-13T12:00:00Z') } },
        ] });
        service = TestBed.inject(ProfessoresService);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    it('lê o cadastro completo antes de publicar e inclui professores sem alocações', () => {
        service.carregarProfessores();
        cadastro().flush(paginaApi([lista[0]], 0, 2));
        expect(service.professoresFiltrados()).toEqual([]);
        expect(service.carregando()).toBeTrue();
        http.expectNone(r => r.url === '/api/alocacoes');
        cadastro(1).flush(paginaApi(lista.slice(1), 1, 2));
        expect(service.professoresFiltrados().map(p => p.id)).toEqual([1, 3, 2]);
        expect(service.professoresFiltrados().every(p => p.cargo === null)).toBeTrue();
        expect(service.professorSelecionado()?.id).toBe(1);
        const req = grade();
        expect(req.request.headers.has('Authorization')).toBeFalse();
        req.flush(paginaApi([]));
        expect(service.diasAgrupados()).toEqual([]);
        expect(service.erroAulas()).toBeNull();
    });

    it('publica a grade somente após todas as páginas usando id_usuario e total_pages', () => {
        service.carregarProfessores();
        cadastro().flush(paginaApi(lista));
        grade().flush(paginaApi([alocacaoApi()], 0, 2));
        expect(service.diasAgrupados()).toEqual([]);
        expect(service.carregandoAulas()).toBeTrue();
        grade().flush(paginaApi([{ ...alocacaoApi(2), bloco_horario: { hora_inicio: '14:20', hora_fim: '15:10' } }], 1, 2));
        expect(service.diasAgrupados()[0].itens.map(i => i.tipo)).toEqual(['aula', 'intervalo', 'aula']);
        expect(service.carregandoAulas()).toBeFalse();
    });

    it('busca no Service sem acentos e cancela a grade ao selecionar outro docente ou nenhum', () => {
        service.carregarProfessores();
        cadastro().flush(paginaApi(lista));
        const antiga = grade();
        service.buscar('zel');
        expect(antiga.cancelled).toBeTrue();
        expect(service.professorSelecionado()?.id).toBe(2);
        const atual = grade(2);
        service.buscar('inexistente');
        expect(atual.cancelled).toBeTrue();
        expect(service.professorSelecionado()).toBeNull();
        expect(service.diasAgrupados()).toEqual([]);
        expect(service.carregandoAulas()).toBeFalse();
        service.buscar('');
        grade().flush(paginaApi([alocacaoApi()]));
        expect(service.professoresFiltrados().length).toBe(3);
    });

    it('filtra docentes com vários cursos por ID e reconsulta a grade do selecionado', () => {
        service.carregar();
        http.expectOne(r => r.url === '/api/cursos').flush(paginaApi([]));
        cadastro().flush(paginaApi(lista));
        grade().flush(paginaApi([alocacaoApi(), alocacaoApi(2, 1, 2, 'Gestão')]));
        cursos().flush(paginaApi([alocacaoApi(), alocacaoApi(2, 1, 2, 'Gestão'), alocacaoApi(3, 2)]));
        expect(service.cursos().map(c => c.id)).toEqual([1, 2]);
        service.selecionarCurso(2);
        expect(service.professoresFiltrados().map(p => p.id)).toEqual([1]);
        grade().flush(paginaApi([alocacaoApi(), alocacaoApi(2, 1, 2, 'Gestão')]));
        expect(service.diasAgrupados()[0].itens.length).toBe(1);
        service.selecionarCurso(null);
        grade().flush(paginaApi([]));
        expect(service.professoresFiltrados().length).toBe(3);
    });

    it('não publica cursos parciais e preserva cadastro/grade quando sua consulta falha', () => {
        service.carregar();
        http.expectOne(r => r.url === '/api/cursos').flush(paginaApi([]));
        cadastro().flush(paginaApi(lista));
        grade().flush(paginaApi([alocacaoApi()]));
        cursos().flush(paginaApi([alocacaoApi()], 0, 2));
        expect(service.cursos()).toEqual([]);
        cursos().flush({}, { status: 500, statusText: 'Falha' });
        expect(service.erroCursos()).toBeTruthy();
        expect(service.professoresFiltrados().length).toBe(3);
        expect(service.diasAgrupados().length).toBe(1);
        service.carregarCursos();
        http.expectOne(r => r.url === '/api/cursos').flush(paginaApi([]));
        cursos().flush(paginaApi([alocacaoApi()]));
        expect(service.erroCursos()).toBeNull();
        expect(service.cursos().length).toBe(1);
    });

    it('recusa alocações de outro professor e permite retry sem fallback mockado', () => {
        service.carregarProfessores();
        cadastro().flush(paginaApi(lista));
        grade().flush(paginaApi([alocacaoApi(1, 2)]));
        expect(service.erroAulas()).toBeTruthy();
        expect(service.diasAgrupados()).toEqual([]);
        service.carregarAulas();
        grade().flush(paginaApi([alocacaoApi()]));
        expect(service.erroAulas()).toBeNull();
        expect(service.diasAgrupados().length).toBe(1);
    });

    it('cancela uma grade pendente ao trocar rapidamente de card e limpa as aulas anteriores', () => {
        service.carregarProfessores();
        cadastro().flush(paginaApi(lista));
        grade().flush(paginaApi([alocacaoApi()]));
        service.selecionarProfessor(2);
        const antiga = grade(2);
        expect(service.diasAgrupados()).toEqual([]);
        service.selecionarProfessor(3);
        expect(antiga.cancelled).toBeTrue();
        grade(3).flush(paginaApi([]));
        expect(service.professorSelecionado()?.id).toBe(3);
        expect(service.erroAulas()).toBeNull();
    });

    it('rejeita paginação instável ou duplicada, descarta cadastro parcial e permite retry', () => {
        service.carregarProfessores();
        cadastro().flush(paginaApi([lista[0]], 0, 2));
        cadastro(1).flush(paginaApi([lista[1]], 1, 3));
        expect(service.erro()).toBeTruthy();
        expect(service.professoresFiltrados()).toEqual([]);
        service.carregarProfessores();
        cadastro().flush(paginaApi([lista[0], lista[0]]));
        expect(service.erro()).toBeTruthy();
        service.carregarProfessores();
        cadastro().flush(paginaApi(lista));
        grade().flush(paginaApi([]));
        expect(service.erro()).toBeNull();
    });

    it('distingue falha de conexão e acesso negado de um cadastro ou grade vazios', () => {
        service.carregarProfessores();
        cadastro().error(new ProgressEvent('error'));
        expect(service.erro()).toContain('conectar ao servidor');
        expect(service.professorSelecionado()).toBeNull();
        service.carregarProfessores();
        cadastro().flush(paginaApi(lista));
        grade().flush({}, { status: 403, statusText: 'Forbidden' });
        expect(service.erroAulas()).toContain('permissão');
        expect(service.carregandoAulas()).toBeFalse();
    });

    it('indica acesso restrito e não consulta o índice global de cursos sem confirmação', () => {
        config.agendaSalasCompleta = false;
        // A configuração é capturada ao criar a instância.
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [ProfessoresService, { provide: ProfessoresLocaisService, useValue: fonteProfessoresLocaisTeste() }, provideHttpClient(), provideHttpClientTesting(),
            { provide: BACKEND_CONFIG, useValue: config }, { provide: RelogioService, useValue: {
                agora: () => new Date('2026-10-13T12:00:00Z') } }] });
        service = TestBed.inject(ProfessoresService);
        http = TestBed.inject(HttpTestingController);
        service.carregar();
        http.expectOne(r => r.url === '/api/cursos').flush(paginaApi([]));
        cadastro().flush(paginaApi(lista));
        grade().flush(paginaApi([]));
        http.expectNone(r => r.url === '/api/alocacoes' && !r.params.has('id_usuario'));
        expect(service.agendaCompleta).toBeFalse();
        expect(service.cursos()).toEqual([]);
        expect(service.professoresFiltrados().length).toBe(3);
    });

    it('cancela cadastro, cursos e grade ao destruir a página', () => {
        service.carregar();
        http.expectOne(r => r.url === '/api/cursos').flush(paginaApi([]));
        const listaPendente = cadastro();
        const cursosPendentes = cursos();
        listaPendente.flush(paginaApi(lista));
        const gradePendente = grade();
        service.carregarProfessores();
        const novoCadastro = cadastro();
        expect(gradePendente.cancelled).toBeTrue();
        TestBed.resetTestingModule();
        expect(novoCadastro.cancelled).toBeTrue();
        expect(cursosPendentes.cancelled).toBeTrue();
    });

    it('respeita módulos desabilitados e não envia requisições ao endereço de produção', () => {
        config.modulos = [];
        service.carregar();
        http.expectNone(r => r.url.startsWith('/api'));
        expect(service.erro()).toContain('ainda não está disponível');
        expect(service.erroCursos()).toContain('ainda não está disponível');
    });

    it('lista o catálogo inteiro de cursos com paginação, incluindo cursos sem alocações e inativos', () => {
        service.carregarCatalogoCursos();
        http.expectOne(r => r.url === '/api/cursos' && r.params.get('page') === '0')
            .flush(paginaApi([{ id: 1, nome: 'ADS', status: 'ATIVO' }], 0, 2));
        expect(service.cursos()).toEqual([]);
        http.expectOne(r => r.url === '/api/cursos' && r.params.get('page') === '1')
            .flush(paginaApi([{ id: 2, nome: 'Gestão', status: 'INATIVO' }], 1, 2));
        expect(service.cursos().map(c => c.id)).toEqual([1, 2]);
        service.selecionarCurso(2);
        service.selecionarCurso(2);
        expect(service.cursoSelecionado()).toBe(2);
        expect(service.professoresFiltrados()).toEqual([]);
        http.expectNone(r => r.url === '/api/alocacoes');
    });
});
