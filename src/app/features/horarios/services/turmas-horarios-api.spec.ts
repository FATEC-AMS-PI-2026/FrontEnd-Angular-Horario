import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TurmasHorariosApiService } from './turmas-horarios-api';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { ItemHorario } from '../models/item-horario';
import { Turma } from '../models/turma';
import { ALOCACAO_REAL } from './mapeadores-backend.spec';

const BASE = 'https://backend.test';

function pagina(content: unknown[]) {
    return { content, page: 0, size: 200, totalElements: content.length, totalPages: 1 };
}

describe('TurmasHorariosApiService (#150)', () => {
    let service: TurmasHorariosApiService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(), provideHttpClientTesting(),
                { provide: BACKEND_CONFIG, useValue: { habilitado: false, url: BASE + '/', modulos: ['turmas', 'alocacoes'] } },
            ],
        });
        service = TestBed.inject(TurmasHorariosApiService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('lista as turmas do curso pelo filtro `curso`, em uma página só e ordenadas', () => {
        let turmas: Turma[] = [];
        service.listarTurmasDoCurso(1).subscribe(t => turmas = t);
        const req = http.expectOne(r => r.url === `${BASE}/turmas`);
        expect(req.request.params.get('curso')).toBe('1');
        expect(req.request.params.get('size')).toBe('200');
        expect(req.request.params.has('ano')).toBeFalse();
        // Resposta real de GET /turmas?curso=1 (ADS) do seed.
        req.flush(pagina([
            { id: 4, codigo: '2/2026-ADS', periodo: 2, ano: 2026, numeroAlunos: 38, curso: { id: 1, nome: 'Analise e Desenvolvimento de Sistemas' } },
            { id: 2, codigo: '1/2026', periodo: 1, ano: 2026, numeroAlunos: 40, curso: { id: 1, nome: 'Analise e Desenvolvimento de Sistemas' } },
            { id: 9, codigo: null, periodo: 1, ano: 2026 },
        ]));
        expect(turmas.map(t => t.codigo)).toEqual(['1/2026', '2/2026-ADS']);
        expect(turmas[0].numeroAlunos).toBe(40);
    });

    it('repassa ano e período quando informados', () => {
        service.listarTurmasDoCurso(2, { ano: 2027, periodo: 1 }).subscribe();
        const req = http.expectOne(r => r.url === `${BASE}/turmas`);
        expect(req.request.params.get('ano')).toBe('2027');
        expect(req.request.params.get('periodo')).toBe('1');
        req.flush(pagina([]));
    });

    it('entrega os horários da turma no formato da tela, só do quadro ativo e com intervalos', () => {
        let itens: ItemHorario[] = [];
        service.listarHorariosDaTurma(2).subscribe(i => itens = i);
        const req = http.expectOne(r => r.url === `${BASE}/alocacoes`);
        expect(req.request.params.get('turma')).toBe('2');
        req.flush(pagina([
            { ...ALOCACAO_REAL, id: 3, blocoHorario: { horaInicio: '15:10:00', horaFim: '16:00:00' },
              disciplina: { nome: 'Banco de Dados' }, professor: null },
            ALOCACAO_REAL,
            { ...ALOCACAO_REAL, id: 2, blocoHorario: { horaInicio: '14:10:00', horaFim: '15:00:00' } },
            { ...ALOCACAO_REAL, id: 7, quadroHorario: { ...ALOCACAO_REAL.quadroHorario, status: 'INATIVO' } },
        ]));
        expect(itens.map(i => i.tipo === 'aula' ? `${i.inicio} ${i.materia} · ${i.professor} · ${i.sala}` : `${i.inicio} intervalo`)).toEqual([
            '13:20 Programação Multiplataforma · Carlos · LAB-01',
            '14:10 Programação Multiplataforma · Carlos · LAB-01',
            '15:00 intervalo',
            '15:10 Banco de Dados · Professor a definir · LAB-01',
        ]);
    });

    it('aceita a paginação no formato snake_case e resposta sem `content`', () => {
        let itens: ItemHorario[] | undefined;
        service.listarHorariosDaTurma(5).subscribe(i => itens = i);
        http.expectOne(r => r.url === `${BASE}/alocacoes`).flush({ total_elements: 0 });
        expect(itens).toEqual([]);
    });

    it('com 500 em /turmas (bug do backend no PostgreSQL) deduz as turmas do curso pelas alocações', () => {
        let turmas: Turma[] = [];
        service.listarTurmasDoCurso(1).subscribe(t => turmas = t);
        http.expectOne(r => r.url === `${BASE}/turmas`)
            .flush({ message: 'function lower(bytea) does not exist' }, { status: 500, statusText: 'Erro' });
        const req = http.expectOne(r => r.url === `${BASE}/alocacoes`);
        expect(req.request.params.has('turma')).toBeFalse();
        expect(req.request.params.get('size')).toBe('200');
        req.flush(pagina([
            { ...ALOCACAO_REAL, turma: { id: 4, codigo: '2/2026-ADS', periodo: 2, ano: 2026, numeroAlunos: 38, curso: { id: 1 } } },
            ALOCACAO_REAL,
            { ...ALOCACAO_REAL, id: 9 },
            { ...ALOCACAO_REAL, turma: { id: 1, codigo: '2/2026', periodo: 2, ano: 2026, curso: { id: 2 } } },
        ]));
        expect(turmas.map(t => t.codigo)).toEqual(['1/2026', '2/2026-ADS']);
    });

    it('propaga o erro quando o plano B também falha', () => {
        let status = 0;
        service.listarTurmasDoCurso(1).subscribe({ error: e => status = e.status });
        http.expectOne(r => r.url === `${BASE}/turmas`).flush({}, { status: 500, statusText: 'Erro' });
        http.expectOne(r => r.url === `${BASE}/alocacoes`).flush({}, { status: 503, statusText: 'Indisponível' });
        expect(status).toBe(503);
    });

    it('não usa o plano B para erro do cliente (ex.: 400) e deixa o erro para quem chamou', () => {
        let status = 0;
        service.listarTurmasDoCurso(1).subscribe({ error: e => status = e.status });
        http.expectOne(r => r.url === `${BASE}/turmas`).flush({ message: 'erro' }, { status: 400, statusText: 'Erro' });
        http.expectNone(r => r.url === `${BASE}/alocacoes`);
        expect(status).toBe(400);
    });
});
