import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { BACKEND_CONFIG } from '../../core/services/backend-config';
import { RelogioService } from '../salas/services/relogio';
import { Professores } from './professores';
import { ProfessoresService } from './services/professores';
import { paraAulaProfessor } from './services/mapeadores-professores';
import { ProfessoresLocaisService } from './services/professores-locais';
import { fonteProfessoresLocaisTeste } from './testing/professores-locais.fixture';
import { alocacaoApi, paginaApi, professorApi } from './testing/professores-api.fixture';

describe('Professores: estados e navegação', () => {
    let fixture: ComponentFixture<Professores>;
    let http: HttpTestingController;
    let lista: TestRequest;
    let cursos: TestRequest;
    const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    const grade = (id = 1) => http.expectOne(r => r.url === '/api/alocacoes' && r.params.get('id_usuario') === String(id));
    const carregar = () => {
        cursos.flush(paginaApi([alocacaoApi()]));
        lista.flush(paginaApi([professorApi(1, 'Ana'), professorApi(2, 'Zélia')]));
        fixture.detectChanges();
        return grade();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [Professores], providers: [
            provideHttpClient(), provideHttpClientTesting(),
            { provide: BACKEND_CONFIG, useValue: { url: '/api', modulos: ['professores', 'alocacoes', 'cursos'], agendaSalasCompleta: true } },
            { provide: RelogioService, useValue: { agora: () => new Date('2026-10-13T12:00:00Z') } },
        ] }).overrideComponent(Professores, { set: { providers: [
            ProfessoresService, { provide: ProfessoresLocaisService, useValue: fonteProfessoresLocaisTeste() },
        ] } }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(Professores);
        http.expectOne(r => r.url === '/api/cursos').flush(paginaApi([]));
        lista = http.expectOne(r => r.url === '/api/professores');
        cursos = http.expectOne(r => r.url === '/api/alocacoes' && !r.params.has('id_usuario'));
        fixture.detectChanges();
    });
    afterEach(() => { fixture.destroy(); http.verify(); });

    it('mostra carregamento sem anunciar listas/grades vazias nem cargo fictício', () => {
        expect(texto()).toContain('Carregando professores');
        expect(texto()).toContain('Carregando cursos');
        expect(texto()).not.toContain('Nenhum professor');
        expect(texto()).not.toContain('Nenhuma aula');
        expect(fixture.nativeElement.querySelector('[aria-label="Filtrar por cargo"]')).toBeNull();
    });

    it('renderiza nomes, cursos, turma e horários reais do Service', () => {
        carregar().flush(paginaApi([alocacaoApi()]));
        fixture.detectChanges();
        expect(texto()).toContain('Prof. Ana');
        expect(texto()).toContain('Prof. Zélia');
        expect(texto()).toContain('ADS');
        expect(texto()).toContain('Terça-feira');
        expect(texto()).toContain('13:20');
        expect(texto()).toContain('LAB-01 – Prédio 1');
        expect(texto()).toContain('Turma 1/2026');
        expect(texto()).not.toContain('Glauco');
        expect(texto()).not.toContain('Andar');
    });

    it('não confunde loading/erro da grade com ausência de aulas e permite retry', () => {
        const req = carregar();
        expect(texto()).toContain('Carregando aulas');
        expect(texto()).not.toContain('Nenhuma aula');
        req.flush({}, { status: 500, statusText: 'Falha' });
        fixture.detectChanges();
        expect(texto()).toContain('Não foi possível carregar as aulas');
        expect(texto()).not.toContain('Nenhuma aula');
        (fixture.nativeElement.querySelector('.aulas-professor button') as HTMLButtonElement).click();
        grade().flush(paginaApi([]));
        fixture.detectChanges();
        expect(texto()).toContain('Nenhuma aula cadastrada para este professor no período vigente');
    });

    it('não anuncia cadastro vazio em falhas e reconsulta somente a fonte que falhou', () => {
        cursos.flush(paginaApi([]));
        lista.flush({}, { status: 500, statusText: 'Falha' });
        fixture.detectChanges();
        expect(texto()).toContain('Não foi possível carregar os professores');
        expect(texto()).not.toContain('Nenhum professor');
        (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
        http.expectOne(r => r.url === '/api/professores').flush(paginaApi([]));
        fixture.detectChanges();
        expect(texto()).toContain('Nenhum professor encontrado');
        http.expectNone(r => r.url === '/api/alocacoes');
    });

    it('busca sem acentos, seleciona o docente correto e cancela a resposta anterior', () => {
        const antiga = carregar();
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'zel';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(antiga.cancelled).toBeTrue();
        expect(texto()).toContain('Aulas (Zélia)');
        expect(texto()).not.toContain('Prof. Ana');
        grade(2).flush(paginaApi([]));
        fixture.detectChanges();
        expect(texto()).toContain('Nenhuma aula cadastrada');
    });

    it('cancela as consultas da página ao navegar para fora', () => {
        lista.flush(paginaApi([professorApi()]));
        const aulas = grade();
        fixture.destroy();
        expect(cursos.cancelled).toBeTrue();
        expect(aulas.cancelled).toBeTrue();
    });

    it('mantém aulas locais visíveis quando a grade Java falha', () => {
        const req = carregar();
        const locais = fixture.debugElement.injector.get(ProfessoresLocaisService);
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'Ana', cargo: null }]);
        locais.aulas.set([{ ...paraAulaProfessor(alocacaoApi(), '2026-10-13')!,
            id: 'local-1', professorId: 'local-1', disciplina: 'Aula do catálogo local',
            curso: { id: 'local-1', nome: 'Curso local' } }]);
        req.flush({}, { status: 500, statusText: 'Falha' });
        fixture.detectChanges();
        expect(texto()).toContain('Não foi possível carregar as aulas');
        expect(texto()).toContain('Aula do catálogo local');
        expect(texto()).not.toContain('Nenhuma aula');
    });

    it('não confirma grade vazia em falha do catálogo local e preserva os cards Java', () => {
        carregar().flush(paginaApi([]));
        fixture.debugElement.injector.get(ProfessoresLocaisService).erro.set('Não foi possível ler o catálogo.');
        fixture.detectChanges();
        expect(texto()).toContain('Não foi possível ler o catálogo');
        expect(texto()).toContain('Prof. Ana');
        expect(texto()).not.toContain('Nenhuma aula');
    });

    it('usa a lista de cursos no lugar do cargo e trata IDs locais e Java na seleção', () => {
        carregar().flush(paginaApi([]));
        const locais = fixture.debugElement.injector.get(ProfessoresLocaisService);
        locais.cursos.set([{ id: 'local-1', nome: 'PGE — AMS' }]);
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'Glauco', cargo: null }]);
        locais.aulas.set([{ ...paraAulaProfessor(alocacaoApi(), '2026-10-13')!,
            id: 'local-1', professorId: 'local-1', curso: { id: 'local-1', nome: 'PGE — AMS' } }]);
        fixture.detectChanges();
        const select = fixture.nativeElement.querySelector('[aria-label="Filtrar por curso"]') as HTMLSelectElement;
        expect([...select.options].map(o => o.text)).toEqual(['Todos os cursos', 'ADS', 'PGE — AMS']);
        expect(fixture.nativeElement.querySelector('[aria-label="Filtrar por cargo"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('.curso-chip')).toBeNull();
        select.value = 'local-1';
        select.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(texto()).toContain('Prof. Glauco');
        expect(texto()).not.toContain('Prof. Ana');
        http.expectNone(r => r.url === '/api/alocacoes');
        select.value = '1';
        select.dispatchEvent(new Event('change'));
        grade().flush(paginaApi([]));
        fixture.detectChanges();
        expect(texto()).toContain('Prof. Ana');
        expect(texto()).not.toContain('Prof. Glauco');
        select.value = '';
        select.dispatchEvent(new Event('change'));
        grade().flush(paginaApi([]));
        fixture.detectChanges();
        expect(texto()).toContain('Prof. Ana');
        expect(texto()).toContain('Prof. Glauco');
    });
});
