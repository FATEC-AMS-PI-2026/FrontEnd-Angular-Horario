import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { BACKEND_CONFIG } from '../../core/services/backend-config';
import { Dashboard } from './dashboard';
import { AlocacaoResponse } from './models/grade-dia.model';
import { CARREGAR_GRADE_DIA } from './services/dashboard.service';
import { CARREGAR_GRADE_SEMANAL } from '../horarios/services/grade-semanal-source';
import { mapearSalasHoje } from './services/salas-hoje';
import { RelogioService } from '../salas/services/relogio';
import { SalasLocaisService } from '../salas/services/salas-locais';
import { SalaApi, SalaResumo } from '../salas/models/sala-resumo';
import { AlocacaoSalaApi } from '../salas/services/disponibilidade-sala';
import { ConsultaSalasService } from '../salas/services/consulta-salas';

const BASE = 'https://backend.test';
const salaApi = (id = 71, codigo = 'LAB-03'): SalaApi => ({
    id, codigo, capacidade: 40, tipoSala: { id: 1, nome: 'Laboratório' },
});
const pessoal: AlocacaoResponse = {
    id: 1, disciplina: { id: 1, nome: 'Engenharia de Software', periodo: 1 }, professor: null,
    sala: { id: 1, codigo: 'LAB 03' }, diaSemana: 'QUINTA',
    blocoHorario: { id: 1, horaInicio: '16:00', horaFim: '17:00', duracao: 60 },
    turma: { id: 1, codigo: 'ADS AMS', periodo: 1, ano: 2026 }, quadroHorario: { id: 1, versao: 1 },
};
const global = (): AlocacaoSalaApi => ({
    id: 8, sala: { id: 71 }, disciplina: { nome: 'Aula de outra turma' },
    professor: { nome: 'Docente de outra turma' }, diaSemana: 'QUINTA',
    blocoHorario: { horaInicio: '14:00', horaFim: '15:00' },
    quadroHorario: { status: 'ATIVO', periodoAtividadeQuadro: {
        status: 'ATIVO', dataInicio: '2026-08-01', dataFim: '2026-12-20',
    } },
});

describe('Dashboard: salas integradas', () => {
    let fixture: ComponentFixture<Dashboard>;
    let http: HttpTestingController;
    let instante: Date;
    let gradeSemanal: () => Observable<AlocacaoResponse[]>;
    let locais: { salas: ReturnType<typeof signal<SalaResumo[]>>; catalogo: ReturnType<typeof signal<null>>;
        erro: ReturnType<typeof signal<string | null>>; carregando: ReturnType<typeof signal<boolean>>;
        carregar: jasmine.Spy };

    beforeEach(() => {
        instante = new Date('2026-10-08T14:20:00-03:00');
        gradeSemanal = () => of([pessoal]);
        locais = { salas: signal<SalaResumo[]>([]), catalogo: signal(null), erro: signal<string | null>(null),
            carregando: signal(false), carregar: jasmine.createSpy('carregarLocal') };
        TestBed.configureTestingModule({ imports: [Dashboard], providers: [
            provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
            { provide: BACKEND_CONFIG, useValue: { url: BASE, modulos: ['salas', 'alocacoes'], agendaSalasCompleta: true } },
            { provide: CARREGAR_GRADE_DIA, useValue: () => of([pessoal]) },
            { provide: CARREGAR_GRADE_SEMANAL, useValue: () => gradeSemanal() },
            { provide: RelogioService, useValue: { agora: () => instante } },
            { provide: SalasLocaisService, useValue: locais },
        ] });
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => { fixture.destroy(); http.verify(); });

    function abrir() {
        fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges(); tick(0); fixture.detectChanges();
    }
    function cadastro(salas = [salaApi()]) {
        http.expectOne(r => r.url === `${BASE}/salas`).flush({ content: salas, page: 0, totalPages: salas.length ? 1 : 0 });
    }
    function agenda(alocacoes = [global()]) {
        const req = http.expectOne(r => r.url === `${BASE}/alocacoes`);
        expect(req.request.params.has('usuario')).toBeFalse();
        expect(req.request.params.has('sala')).toBeFalse();
        req.flush({ content: alocacoes, page: 0, totalPages: alocacoes.length ? 1 : 0 });
    }
    const tela = (): HTMLElement => fixture.nativeElement;
    const textos = (seletor: string) => Array.from(tela().querySelectorAll(seletor)).map(el => el.textContent?.trim());

    it('usa a agenda de todas as turmas para Em uso e associa o cadastro por código, sem confundir IDs', fakeAsync(() => {
        abrir(); cadastro();
        expect(tela().querySelector('.card--rooms')?.textContent).toContain('Consultando disponibilidade');
        expect(tela().querySelector('app-status-sala-badge')).toBeNull();
        agenda(); fixture.detectChanges();
        expect(fixture.componentInstance.emAndamento()).toEqual([]);
        expect(tela().querySelector('.card--rooms app-status-sala-badge')?.textContent).toContain('Em uso');
        const salaHoje = tela().querySelector<HTMLAnchorElement>('.today-room-item a')!;
        expect(salaHoje.getAttribute('href')).toBe('/salas/71');
        expect(salaHoje.textContent).toContain('LAB-03');
        expect(tela().querySelector('.today-room-item')?.textContent).toContain('Engenharia de Software');
        expect(tela().querySelector('.today-room-item')?.textContent).toContain('Prédio 1');
        expect(tela().querySelector('.today-room-item')?.textContent).not.toContain('Aula de outra turma');
        fixture.destroy();
    }));

    it('mostra AUD-01 nas salas de hoje sem prédio mesmo com tipo Sala', fakeAsync(() => {
        abrir(); cadastro([{ ...salaApi(3, 'AUD-01'), tipoSala: { id: 2, nome: 'Sala' } }]);
        agenda([]);
        fixture.componentInstance.alocacoes.set([{ ...pessoal, sala: { id: 3, codigo: 'AUD-01' } }]);
        fixture.detectChanges();
        const card = tela().querySelector('.today-room-item')!;
        expect(card.textContent).toContain('AUD-01');
        expect(card.textContent).not.toContain('Prédio');
        expect(card.querySelector('a')?.getAttribute('href')).toBe('/salas/3');
        fixture.destroy();
    }));

    it('reavalia início/fim no relógio sem repetir consultas e renova a agenda a cada minuto', fakeAsync(() => {
        instante = new Date('2026-10-08T13:59:59-03:00');
        abrir(); cadastro(); agenda(); fixture.detectChanges();
        expect(tela().querySelector('.card--rooms')?.textContent).toContain('Livre até às 14:00');
        instante = new Date('2026-10-08T14:00:00-03:00'); tick(1000); fixture.detectChanges();
        expect(tela().querySelector('app-status-sala-badge')?.textContent).toContain('Em uso');
        instante = new Date('2026-10-08T15:00:00-03:00'); tick(1000); fixture.detectChanges();
        expect(tela().querySelector('app-status-sala-badge')?.textContent).toContain('Livre');
        http.expectNone(() => true);
        tick(58_000);
        agenda([]); fixture.detectChanges();
        http.expectNone(r => r.url === `${BASE}/salas`);
        fixture.destroy();
    }));

    it('não publica disponibilidade parcial e recupera só a agenda após falha', fakeAsync(() => {
        abrir(); cadastro();
        http.expectOne(r => r.url === `${BASE}/alocacoes`).flush({ content: [global()], page: 0, totalPages: 2 });
        fixture.detectChanges();
        expect(tela().querySelector('app-status-sala-badge')).toBeNull();
        http.expectOne(r => r.params.get('page') === '1').error(new ProgressEvent('error'));
        fixture.detectChanges();
        expect(tela().querySelector('.card--rooms [role="alert"]')).not.toBeNull();
        expect(tela().querySelector('app-status-sala-badge')).toBeNull();
        expect(tela().querySelector('.today-room-item a')).not.toBeNull();
        tela().querySelector<HTMLButtonElement>('.card--rooms button')!.click();
        agenda([]); fixture.detectChanges();
        expect(tela().querySelector('app-status-sala-badge')?.textContent).toContain('Livre');
        http.expectNone(r => r.url === `${BASE}/salas`);
        fixture.destroy();
    }));

    it('aguarda o complemento local e retira badges se a leitura local falhar', fakeAsync(() => {
        locais.carregando.set(true);
        abrir(); cadastro(); agenda([]); fixture.detectChanges();
        expect(tela().querySelector('app-status-sala-badge')).toBeNull();
        locais.carregando.set(false); fixture.detectChanges();
        expect(tela().querySelector('app-status-sala-badge')?.textContent).toContain('Livre');
        locais.erro.set('Falha na leitura dos horários locais'); fixture.detectChanges();
        expect(tela().querySelector('app-status-sala-badge')).toBeNull();
        tela().querySelector<HTMLButtonElement>('.card--rooms [role="alert"] button')!.click();
        expect(locais.carregar).toHaveBeenCalledTimes(1);
        http.expectNone(() => true);
        fixture.destroy();
    }));

    it('mantém a rota local e a disponibilidade desconhecida de sala com ID igual a outra sala Java', fakeAsync(() => {
        locais.salas.set([{ id: 71, nome: 'LAB 03', origem: 'local', rotaId: 'local-71' }]);
        abrir(); cadastro([salaApi(71, 'LAB-05')]); agenda(); fixture.detectChanges();
        expect(tela().querySelector('.today-room-item a')?.getAttribute('href')).toBe('/salas/local-71');
        const statusLocal = tela().querySelector('a[href="/salas/local-71"]')!;
        expect(statusLocal.textContent).toContain('Disponibilidade indisponível');
        expect(statusLocal.querySelector('app-status-sala-badge')).toBeNull();
        fixture.destroy();
    }));

    it('lista todas as salas com rolagem, primeiro as do aluno (hoje antes da semana) e depois as outras', fakeAsync(() => {
        gradeSemanal = () => of([pessoal, { ...pessoal, id: 2, diaSemana: 'SEGUNDA', sala: { id: 6, codigo: 'auditório' } }]);
        abrir();
        cadastro([salaApi(1, 'Sala 01'), salaApi(2, 'Sala 02'), salaApi(6, 'Auditório'), salaApi(), salaApi(3, 'Sala 03')]);
        agenda([]); fixture.detectChanges();
        expect(textos('.room-status-item strong')).toEqual(['LAB-03', 'Auditório', 'Sala 01', 'Sala 02', 'Sala 03']);
        expect(textos('.room-group-title')).toEqual(['Suas salas', 'Outras salas']);
        expect(textos('.room-status-group:first-child .room-status-item strong')).toEqual(['LAB-03', 'Auditório']);
        expect(getComputedStyle(tela().querySelector('.room-status-list')!).overflowY).toBe('auto');
        fixture.componentInstance.alocacoes.set([]); fixture.detectChanges();
        expect(textos('.room-status-item strong')).toEqual(['Auditório', 'LAB-03', 'Sala 01', 'Sala 02', 'Sala 03']);
        expect(tela().querySelector('.today-rooms-list')?.textContent).toContain('Nenhuma sala vinculada');
        fixture.componentInstance.salasDaSemana.set([]); fixture.detectChanges();
        expect(textos('.room-status-item strong')).toEqual(['Auditório', 'LAB-03', 'Sala 01', 'Sala 02', 'Sala 03']);
        expect(tela().querySelector('.room-group-title')).toBeNull();
        fixture.destroy();
    }));

    it('sem a grade semanal, mantém as salas de hoje primeiro e não cria outro aviso', fakeAsync(() => {
        gradeSemanal = () => throwError(() => new Error('Falha na grade semanal'));
        abrir(); cadastro([salaApi(6, 'Auditório'), salaApi()]); agenda([]); fixture.detectChanges();
        expect(textos('.room-status-item strong')).toEqual(['LAB-03', 'Auditório']);
        expect(textos('.room-group-title')).toEqual(['Suas salas', 'Outras salas']);
        expect(tela().querySelector('.card--rooms [role="alert"]')).toBeNull();
        fixture.destroy();
    }));

    it('cancela consultas ao sair e diferencia falha de cadastro de salas inexistentes', fakeAsync(() => {
        abrir();
        http.expectOne(r => r.url === `${BASE}/salas`).error(new ProgressEvent('error'));
        const req = http.expectOne(r => r.url === `${BASE}/alocacoes`);
        fixture.detectChanges();
        expect(tela().querySelector('.card--rooms')?.textContent).not.toContain('Nenhuma sala cadastrada');
        expect(tela().querySelector('.card--rooms [role="alert"]')).not.toBeNull();
        fixture.destroy(); expect(req.cancelled).toBeTrue(); tick(60_000);
        http.expectNone(() => true);
    }));

    it('preserva manutenção explícita sem inferi-la do inventário ou de uma falha de agenda', fakeAsync(() => {
        abrir(); cadastro(); agenda([]);
        const consulta = fixture.debugElement.injector.get(ConsultaSalasService);
        expect(consulta.disponibilidade({ id: 71, nome: 'LAB-03', status: 'Manutenção' }))
            .toEqual({ status: 'Manutenção', texto: 'Manutenção' });
        fixture.destroy();
    }));
});

describe('Salas de hoje: vínculo entre fontes', () => {
    it('agrupa pelo código, preserva localização conhecida e não associa IDs coincidentes', () => {
        const cadastro: SalaResumo = { id: 71, nome: 'LAB-03', predio: 'Prédio 1', andar: 0 };
        const salas = mapearSalasHoje([pessoal, { ...pessoal, id: 2, sala: { id: 9, codigo: 'lab-03' } }],
            [{ id: 1, nome: 'Outra sala' }, cadastro]);
        expect(salas.length).toBe(1);
        expect(salas[0].sala).toEqual(cadastro);
        expect(salas[0].disciplinas).toBe('Engenharia de Software');
    });
    it('não fabrica localização/rota quando o código está ausente ou ambíguo no cadastro', () => {
        for (const cadastro of [[], [{ id: 1, nome: 'LAB-03' }, { id: 2, nome: 'LAB 03' }]]) {
            const salas = mapearSalasHoje([pessoal], cadastro);
            expect(salas[0].codigo).toBe('LAB 03');
            expect(salas[0].sala).toBeUndefined();
        }
    });
});
