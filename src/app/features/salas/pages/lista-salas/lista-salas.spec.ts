import { signal, WritableSignal } from '@angular/core';
import { SalasLocaisService } from '../../services/salas-locais';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ListaSalas } from './lista-salas';
import { RecursosSalaService } from '../../services/recursos-sala';
import { BACKEND_CONFIG } from '../../../../core/services/backend-config';
import { SalaApi, SalaResumo } from '../../models/sala-resumo';
import { RelogioService } from '../../services/relogio';

const BASE = 'https://backend.test';

function sala(id: number, codigo: string, tipo: string, capacidade = 40): SalaApi {
  return { id, codigo, capacidade, tipoSala: { id: tipo.length, nome: tipo } };
}

describe('ListaSalas', () => {
  let fixture: ComponentFixture<ListaSalas>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaSalas],
      providers: [
        provideRouter([]),
      { provide: SalasLocaisService, useValue: { salas: signal([]), catalogo: signal(null), erro: signal(null), carregando: signal(false), carregar: () => {} } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_CONFIG, useValue: { habilitado: false, url: BASE, modulos: ['salas', 'recurso-sala'] } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaSalas);
    fixture.detectChanges();
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).flush({ content: [], page: 0, totalPages: 0 });
  });

  afterEach(() => http.verify());

  function responder(salas: SalaApi[]): void {
    http.expectOne((req) => req.url === `${BASE}/salas`).flush({
      content: salas, page: 0, size: 200, totalElements: salas.length, totalPages: 1,
    });
    fixture.detectChanges();
  }

  const elemento = (): HTMLElement => fixture.nativeElement;
  const cards = () => elemento().querySelectorAll('.card-sala');

  it('mostra carregando e depois os cards com os dados do backend', () => {
    expect(elemento().querySelector('.lista-salas__estado')?.textContent).toContain('Carregando');

    responder([sala(1, 'LAB-01', 'Laboratorio'), sala(2, 'SALA-21', 'Sala', 50)]);

    expect(cards().length).toBe(2);
    expect(cards()[1].querySelector('h2')?.textContent).toContain('SALA-21');
    expect(cards()[1].querySelector('.card-sala__info')?.textContent?.replace(/\s+/g, ' ')).toContain('Sala · 50 lugares');
    // Prédio, andar e status ainda não vêm da API: nada de filtro de prédio, local ou badge.
    expect(elemento().querySelector('.lista-salas__filtro-predio')).toBeNull();
    expect(elemento().querySelector('.card-sala__local')).toBeNull();
    expect(elemento().querySelector('app-status-sala-badge')).toBeNull();
  });

  it('cria um chip por tipo retornado e filtra por ele', () => {
    responder([
      sala(1, 'LAB-01', 'Laboratorio'),
      sala(2, 'LAB-02', 'Laboratorio'),
      sala(3, 'MAKER-01', 'Sala Maker'),
    ]);
    const chips = Array.from(elemento().querySelectorAll<HTMLButtonElement>('.lista-salas__tipos .filtro-chip'));
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual(['Todos', 'Laboratorio', 'Sala Maker']);

    chips[2].click();
    fixture.detectChanges();

    expect(chips[2].getAttribute('aria-pressed')).toBe('true');
    expect(cards().length).toBe(1);
    expect(cards()[0].textContent).toContain('MAKER-01');
  });

  it('mostra o erro e permite tentar novamente', () => {
    http.expectOne((req) => req.url === `${BASE}/salas`).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    const alerta = elemento().querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('Não foi possível conectar ao servidor');

    alerta!.querySelector('button')!.click();
    fixture.detectChanges();
    responder([sala(1, 'LAB-01', 'Laboratorio')]);

    expect(cards().length).toBe(1);
  });

  it('mantém salas locais navegáveis quando a API falha', () => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.salas as WritableSignal<SalaResumo[]>).set([{ id: 1, nome: 'LAB 03', rotaId: 'local-1', origem: 'local' }]);
    http.expectOne(r => r.url === `${BASE}/salas`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(cards().length).toBe(1);
    expect(cards()[0].getAttribute('href')).toBe('/salas/local-1');
    expect(elemento().querySelector('[role="alert"]')).not.toBeNull();
    expect(cards()[0].querySelector('.equipamento__quantidade')).toBeNull();
    expect(cards()[0].textContent).toContain('Informação de equipamentos não disponível');
    expect(cards()[0].textContent).not.toContain('Nenhum equipamento cadastrado');
  });

  it('aguarda o catálogo local antes de declarar a lista vazia', () => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.carregando as WritableSignal<boolean>).set(true);
    responder([]);
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain('Carregando');
    expect(elemento().querySelector('.lista-salas__vazio')).toBeNull();

    (locais.carregando as WritableSignal<boolean>).set(false);
    fixture.detectChanges();
    expect(elemento().querySelector('.lista-salas__vazio')?.textContent).toContain('Nenhuma sala');
  });

  it('permite recuperar a leitura local sem refazer a consulta Java', () => {
    const locais = TestBed.inject(SalasLocaisService);
    const recarregar = spyOn(locais, 'carregar');
    (locais.erro as WritableSignal<string | null>).set('Falha na leitura local');
    responder([sala(1, 'LAB-01', 'Laboratorio')]);
    expect(cards().length).toBe(1);
    elemento().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    expect(recarregar).toHaveBeenCalledTimes(1);
    http.expectNone(r => r.url === `${BASE}/salas`);
  });

  it('não apresenta falha de consulta como lista vazia', () => {
    http.expectOne(r => r.url === `${BASE}/salas`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(elemento().querySelector('[role="alert"]')).not.toBeNull();
    expect(elemento().querySelector('.lista-salas__vazio')).toBeNull();
  });

  it('mostra recursos remotos sem atribuí-los a uma sala local com o mesmo ID', () => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.salas as WritableSignal<SalaResumo[]>).set([{ id: 1, nome: 'LAB LOCAL', origem: 'local', rotaId: 'local-1' }]);
    const recursos = fixture.debugElement.injector.get(RecursosSalaService);
    recursos.carregar();
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).flush({ page: 0, totalPages: 1, content: [
      { id: 1, sala: { id: 1 }, recurso: { id: 1, nome: 'Projetor multimidia', tipo: { id: 1, nome: 'Equipamento' } }, quantidade: 2 },
    ] });
    responder([sala(1, 'LAB-01', 'Laboratorio')]);
    expect(cards()[0].textContent).toContain('Projetor multimidia');
    expect(cards()[0].querySelector('.equipamento__quantidade')?.textContent?.trim()).toBe('2');
    expect(cards()[1].textContent).not.toContain('Projetor multimidia');
  });

  it('distingue erro de recursos do estado vazio e recupera somente os recursos', () => {
    responder([sala(1, 'LAB-01', 'Laboratorio')]);
    const recursos = fixture.debugElement.injector.get(RecursosSalaService);
    recursos.carregar(); fixture.detectChanges();
    expect(cards()[0].textContent).toContain('Carregando equipamentos');
    expect(cards()[0].textContent).not.toContain('Nenhum equipamento cadastrado');
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(cards()[0].textContent).toContain('Não foi possível conectar');
    expect(cards()[0].textContent).not.toContain('Nenhum equipamento cadastrado');
    elemento().querySelector<HTMLButtonElement>('.lista-salas__estado--erro button')!.click();
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).flush({ content: [], page: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(cards()[0].textContent).toContain('Nenhum equipamento cadastrado');
    http.expectNone(r => r.url === `${BASE}/salas`);
  });
});

describe('ListaSalas: disponibilidade remota', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ListaSalas], providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: BACKEND_CONFIG, useValue: { url: BASE, modulos: ['salas', 'alocacoes', 'recurso-sala'], agendaSalasCompleta: true } },
      { provide: RelogioService, useValue: { agora: () => new Date('2026-10-07T13:00:00-03:00') } },
      { provide: SalasLocaisService, useValue: { salas: signal([]), catalogo: signal(null), erro: signal(null), carregando: signal(false), carregar: () => {} } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('avisa sobre falha da agenda e permite repetir somente essa consulta', fakeAsync(() => {
    const fixture = TestBed.createComponent(ListaSalas); tick(0);
    http.expectOne(r => r.url === `${BASE}/salas`).flush({ content: [sala(1, 'LAB-01', 'Laboratório')], page: 0, totalPages: 1 });
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).flush({ content: [], page: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Consultando disponibilidade');
    http.expectOne(r => r.url === `${BASE}/alocacoes`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível confirmar a disponibilidade');
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.card-sala').length).toBe(1);
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    http.expectOne(r => r.url === `${BASE}/alocacoes`).flush({ content: [], page: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).not.toBeNull();
    http.expectNone(r => r.url === `${BASE}/salas` || r.url === `${BASE}/recurso-sala`);
    const locais = TestBed.inject(SalasLocaisService);
    (locais.erro as WritableSignal<string | null>).set('Falha nos horários deste navegador');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    fixture.destroy();
  }));

  it('reúne três falhas remotas num aviso sem repetir a causa e recupera as três fontes', fakeAsync(() => {
    const fixture = TestBed.createComponent(ListaSalas); tick(0);
    http.expectOne(r => r.url === `${BASE}/salas`).error(new ProgressEvent('error'));
    http.expectOne(r => r.url === `${BASE}/alocacoes`).error(new ProgressEvent('error'));
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    expect(tela.querySelectorAll('[role="alert"]').length).toBe(1);
    const aviso = tela.querySelector('[role="alert"]')!;
    expect(aviso.textContent).toContain('cadastro, disponibilidade, equipamentos');
    expect(aviso.textContent?.match(/Não foi possível conectar ao servidor/g)?.length).toBe(1);
    expect(tela.querySelector('.lista-salas__vazio')).toBeNull();
    aviso.querySelector<HTMLButtonElement>('button')!.click();
    http.expectOne(r => r.url === `${BASE}/salas`).flush({ content: [sala(1, 'LAB-01', 'Laboratório')], page: 0, totalPages: 1 });
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).flush({ content: [], page: 0, totalPages: 0 });
    http.expectOne(r => r.url === `${BASE}/alocacoes`).flush({ content: [], page: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(tela.querySelector('[role="alert"]')).toBeNull();
    expect(tela.querySelectorAll('.card-sala').length).toBe(1);
    fixture.destroy();
  }));

  it('mantém falha local separada e preserva causas remotas diferentes', fakeAsync(() => {
    const fixture = TestBed.createComponent(ListaSalas); tick(0);
    http.expectOne(r => r.url === `${BASE}/salas`).error(new ProgressEvent('error'));
    http.expectOne(r => r.url === `${BASE}/alocacoes`).flush(null, { status: 403, statusText: 'Forbidden' });
    http.expectOne(r => r.url === `${BASE}/recurso-sala`).flush(null, { status: 401, statusText: 'Unauthorized' });
    const locais = TestBed.inject(SalasLocaisService);
    (locais.erro as WritableSignal<string | null>).set('Falha na leitura local');
    const carregarLocal = spyOn(locais, 'carregar');
    fixture.detectChanges();
    const alertas: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="alert"]');
    expect(alertas.length).toBe(2);
    expect(alertas[0].textContent).toContain('Não foi possível conectar');
    expect(alertas[0].textContent).toContain('não tem permissão');
    expect(alertas[0].textContent).toContain('Sua sessão expirou');
    alertas[1].querySelector<HTMLButtonElement>('button')!.click();
    expect(carregarLocal).toHaveBeenCalledTimes(1);
    http.expectNone(() => true);
    fixture.destroy();
  }));
});
