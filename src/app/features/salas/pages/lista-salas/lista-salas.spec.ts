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
import { CatalogoLocal } from '../../../dados-locais/models/catalogo-local';
import { catalogoSalaLocal } from '../../testing/catalogo-local.fixture';
import { Subject } from 'rxjs';
import { AlocacaoResponse } from '../../../dashboard/models/grade-dia.model';
import { CARREGAR_GRADE_SEMANAL } from '../../../horarios/services/grade-semanal-source';
import { SessionService } from '../../../../core/services/session.service';

const BASE = 'https://backend.test';

function sala(id: number, codigo: string, tipo: string, capacidade = 40): SalaApi {
  return { id, codigo, capacidade, tipoSala: { id: tipo.length, nome: tipo } };
}

function alocacaoPessoal(codigo: string, id = 1): AlocacaoResponse {
  return {
    id, sala: { id, codigo }, diaSemana: 'QUINTA', professor: null,
    disciplina: { id: 1, nome: 'Disciplina escolhida', periodo: 1 },
    blocoHorario: { id: 1, horaInicio: '13:00', horaFim: '14:00', duracao: 60 },
    turma: { id: 1, codigo: 'Turma', periodo: 1, ano: 2026 }, quadroHorario: { id: 1, versao: 1 },
  };
}

describe('ListaSalas', () => {
  let fixture: ComponentFixture<ListaSalas>;
  let http: HttpTestingController;
  let grade: Subject<AlocacaoResponse[]>;

  beforeEach(async () => {
    grade = new Subject<AlocacaoResponse[]>();
    await TestBed.configureTestingModule({
      imports: [ListaSalas],
      providers: [
        provideRouter([]),
        { provide: CARREGAR_GRADE_SEMANAL, useValue: () => grade },
        { provide: RelogioService, useValue: { agora: () => new Date('2026-10-05T13:20:00-03:00') } },
      { provide: SalasLocaisService, useValue: { salas: signal([]), catalogo: signal(null), erro: signal(null), carregando: signal(false), carregar: () => {} } },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_CONFIG, useValue: { habilitado: false, url: BASE, modulos: ['salas', 'recursos-salas'] } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaSalas);
    fixture.detectChanges();
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).flush({ content: [], page: 0, totalPages: 0 });
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
    expect(elemento().querySelector('.lista-salas__filtro-predio')?.textContent).toContain('Prédio 1');
    expect(Array.from(elemento().querySelectorAll('.card-sala__local'), local => local.textContent?.trim()))
      .toEqual(['Prédio 1', 'Prédio 1']);
    // Andar e status não são deduzidos do prédio.
    expect(elemento().textContent).not.toContain('andar');
    expect(elemento().querySelector('app-status-sala-badge')).toBeNull();
  });

  it('deixa AUD-01 fora do Prédio 1 mesmo com tipo Sala e preserva os demais filtros', () => {
    responder([sala(1, 'LAB-01', 'Laboratório'), sala(3, 'AUD-01', 'Sala', 120)]);
    expect(cards().length).toBe(2);
    expect(cards()[0].querySelector('.card-sala__local')).toBeNull();
    const filtro = elemento().querySelector<HTMLSelectElement>('.lista-salas__filtro-predio')!;
    expect(Array.from(filtro.options, opcao => opcao.value)).toEqual(['', 'Prédio 1']);
    filtro.value = 'Prédio 1'; filtro.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(cards().length).toBe(1);
    expect(cards()[0].textContent).toContain('LAB-01');

    filtro.value = ''; filtro.dispatchEvent(new Event('change')); fixture.detectChanges();
    const auditório = Array.from(elemento().querySelectorAll<HTMLButtonElement>('.lista-salas__tipos button'))
      .find(chip => chip.textContent?.trim() === 'Auditórios')!;
    auditório.click(); fixture.detectChanges();
    expect(cards().length).toBe(1);
    expect(cards()[0].textContent).toContain('AUD-01');
    expect(cards()[0].querySelector('.card-sala__local')).toBeNull();
  });

  it('reúne auditórios Java e locais em um filtro próprio, separado das salas comuns', () => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.salas as WritableSignal<SalaResumo[]>).set([
      { id: 90, nome: 'AUD_02', origem: 'local', rotaId: 'local-90' },
    ]);
    responder([
      sala(1, 'LAB-01', 'Laboratorio'), sala(3, 'AUD-01', 'Sala', 120),
      sala(4, 'Auditório principal', 'Sala'), sala(5, 'ESPACO-03', 'Auditorio'),
      sala(6, 'Sala 11', 'Sala'),
    ]);
    const chips = Array.from(elemento().querySelectorAll<HTMLButtonElement>('.lista-salas__tipos button'));
    expect(chips.map(chip => chip.textContent?.trim())).toEqual(['Todos', 'Auditórios', 'Laboratorio', 'Sala']);

    chips[1].click(); fixture.detectChanges();
    expect(chips[1].getAttribute('aria-pressed')).toBe('true');
    expect(Array.from(cards(), card => card.querySelector('h2')?.textContent))
      .toEqual(['AUD-01', 'AUD_02', 'Auditório principal', 'ESPACO-03']);
    expect(Array.from(cards(), card => card.getAttribute('href'))).toContain('/salas/local-90');

    chips[3].click(); fixture.detectChanges();
    expect(cards().length).toBe(1);
    expect(cards()[0].querySelector('h2')?.textContent).toBe('Sala 11');
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

  it('ordena nomes e números nas duas fontes e preserva a precedência do Java', () => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.salas as WritableSignal<SalaResumo[]>).set([
      { id: 90, nome: 'Sala 3', origem: 'local', rotaId: 'local-90' },
      { id: 91, nome: 'LAB 02', origem: 'local', rotaId: 'local-91' },
      { id: 92, nome: 'Sala 2', origem: 'local', rotaId: 'local-92' },
    ]);
    responder([sala(10, 'Sala 10', 'Sala'), sala(12, 'LAB-10', 'Laboratório'),
      sala(2, 'Sala 2', 'Sala'), sala(1, 'Auditório', 'Auditório')]);
    expect(Array.from(cards(), card => card.querySelector('h2')?.textContent))
      .toEqual(['Auditório', 'LAB 02', 'LAB-10', 'Sala 2', 'Sala 3', 'Sala 10']);
    expect(cards()[3].getAttribute('href')).toBe('/salas/2');
    expect((locais.salas as WritableSignal<SalaResumo[]>)()[0].nome).toBe('Sala 3');
  });

  it('separa as salas da grade semanal por código e mantém ordem e grupos nos filtros', () => {
    responder([sala(5, 'Sala 10', 'Sala'), sala(1, 'Sala 2', 'Sala'),
      sala(3, 'LAB-02', 'Laboratório'), sala(4, 'Sala 3', 'Sala'), sala(6, 'Auditório', 'Auditório')]);
    // Hoje é segunda; a quinta também participa. IDs coincidentes não definem o vínculo.
    grade.next([alocacaoPessoal('Sala 10', 1), alocacaoPessoal(' lab 02 ', 90), alocacaoPessoal('SALA-2', 91)]);
    fixture.detectChanges();
    const grupos = elemento().querySelectorAll('.lista-salas__grupo');
    expect(Array.from(grupos, grupo => grupo.getAttribute('aria-label'))).toEqual(['Suas salas', 'Outras salas']);
    expect(Array.from(grupos[0].querySelectorAll('.card-sala h2'), el => el.textContent))
      .toEqual(['LAB-02', 'Sala 2', 'Sala 10']);
    expect(Array.from(grupos[1].querySelectorAll('.card-sala h2'), el => el.textContent))
      .toEqual(['Auditório', 'Sala 3']);
    const busca = elemento().querySelector<HTMLInputElement>('input[type="search"]')!;
    busca.value = 'Sala 3'; busca.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(elemento().querySelector('.lista-salas__titulo-grupo')?.textContent).toBe('Outras salas');
    expect(cards().length).toBe(1);
    busca.value = 'inexistente'; busca.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(elemento().querySelector('.lista-salas__vazio')).not.toBeNull();
    expect(elemento().querySelector('.lista-salas__grupo')).toBeNull();
  });

  it('preserva Sala 09 e Sala 9¾ como espaços diferentes no vínculo com a grade', () => {
    responder([sala(1, 'Sala 09', 'Sala'), sala(2, 'Sala 9¾', 'Sala')]);
    grade.next([alocacaoPessoal('Sala 9¾')]); fixture.detectChanges();
    expect(elemento().querySelector('[aria-label="Suas salas"] .card-sala h2')?.textContent).toBe('Sala 9¾');
    expect(elemento().querySelector('[aria-label="Outras salas"] .card-sala h2')?.textContent).toBe('Sala 09');
  });

  it('mantém cadastro ordenado sem atribuir salas pessoais quando a grade falha', () => {
    responder([sala(1, 'Sala 10', 'Sala'), sala(2, 'Sala 2', 'Sala')]);
    grade.error(new Error('Grade indisponível')); fixture.detectChanges();
    expect(Array.from(cards(), card => card.querySelector('h2')?.textContent)).toEqual(['Sala 2', 'Sala 10']);
    expect(elemento().querySelector('.lista-salas__titulo-grupo')).toBeNull();
  });

  it('cancela a grade de outra conta e limpa a separação ao trocar de sessão', () => {
    responder([sala(1, 'Sala 2', 'Sala'), sala(2, 'Sala 10', 'Sala')]);
    const antiga = grade;
    grade = new Subject<AlocacaoResponse[]>();
    const sessao = TestBed.inject(SessionService);
    sessao.iniciar('salas-teste', { nome: 'Aluno', email: 'aluno@teste', curso: 'ADS', periodo: '1' }, false);
    fixture.detectChanges();
    antiga.next([alocacaoPessoal('Sala 2')]); fixture.detectChanges();
    expect(elemento().querySelector('.lista-salas__titulo-grupo')).toBeNull();
    grade.next([alocacaoPessoal('Sala 10')]); fixture.detectChanges();
    expect(elemento().querySelector('[aria-label="Suas salas"] .card-sala h2')?.textContent).toBe('Sala 10');
    grade = new Subject<AlocacaoResponse[]>();
    sessao.limpar(); fixture.detectChanges();
    expect(elemento().querySelector('.lista-salas__titulo-grupo')).toBeNull();
  });

  it('agrupa laboratórios Java e locais no mesmo filtro mesmo com diferenças de acento e caixa', () => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.salas as WritableSignal<SalaResumo[]>).set([
      { id: 90, nome: 'LAB 02', tipo: 'Laboratório', origem: 'local', rotaId: 'local-90' },
    ]);
    responder([sala(1, 'LAB-01', 'Laboratorio'), sala(2, 'Sala 11', 'Sala')]);
    const chips = Array.from(elemento().querySelectorAll<HTMLButtonElement>('.lista-salas__tipos button'));
    expect(chips.map(chip => chip.textContent?.trim())).toEqual(['Todos', 'Laboratorio', 'Sala']);
    chips[1].click(); fixture.detectChanges();
    expect(Array.from(cards(), card => card.querySelector('h2')?.textContent)).toEqual(['LAB-01', 'LAB 02']);
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
    expect(Array.from(cards()[0].querySelectorAll('.equipamento__quantidade'), el => el.textContent?.trim())).toEqual(['1', '40']);
    expect(cards()[0].textContent).toContain('Projetor multimidia');
    expect(cards()[0].textContent).toContain('Computadores');
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
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).flush({ page: 0, totalPages: 1, content: [
      { id: 1, sala: { id: 1 }, recurso: { id: 1, nome: 'Projetor multimidia', tipo: { id: 1, nome: 'Equipamento' } }, quantidade: 2 },
    ] });
    responder([sala(1, 'LAB-01', 'Laboratorio')]);
    expect(cards()[0].textContent).toContain('Projetor multimidia');
    expect(cards()[0].querySelector('.equipamento__quantidade')?.textContent?.trim()).toBe('2');
    expect(Array.from(cards()[1].querySelectorAll('.equipamento__quantidade'), el => el.textContent?.trim())).toEqual(['1', '40']);
    expect(cards()[1].textContent).toContain('Computadores');
  });

  it('mostra inventário e status de cada sala local mesmo sem uma agenda Java habilitada', () => {
    const c = catalogoSalaLocal(); c.salas.push({ id: 91, codigo: 'Sala 11' });
    const locais = TestBed.inject(SalasLocaisService);
    (locais.catalogo as WritableSignal<CatalogoLocal | null>).set(c);
    (locais.salas as WritableSignal<SalaResumo[]>).set(c.salas.map(s => ({
      id: s.id, nome: s.codigo, origem: 'local', rotaId: `local-${s.id}`,
    })));
    responder([]);
    expect(cards()[0].querySelector('app-status-sala-badge')?.textContent).toContain('Em uso');
    expect(cards()[1].querySelector('app-status-sala-badge')?.textContent).toContain('Livre');
    expect(Array.from(cards()[0].querySelectorAll('.equipamento__quantidade'), el => el.textContent?.trim())).toEqual(['1', '40']);
    expect(Array.from(cards()[1].querySelectorAll('.equipamento__quantidade'), el => el.textContent?.trim())).toEqual(['1', '1']);
    expect(cards()[1].textContent).toContain('Televisão');
    (locais.carregando as WritableSignal<boolean>).set(true); fixture.detectChanges();
    expect(elemento().querySelector('app-status-sala-badge')).toBeNull();
    (locais.carregando as WritableSignal<boolean>).set(false);
    (locais.erro as WritableSignal<string | null>).set('Falha na leitura local'); fixture.detectChanges();
    expect(elemento().querySelector('app-status-sala-badge')).toBeNull();
  });

  it('distingue erro de recursos do estado vazio e recupera somente os recursos', () => {
    responder([sala(1, 'LAB-01', 'Laboratorio')]);
    const recursos = fixture.debugElement.injector.get(RecursosSalaService);
    recursos.carregar(); fixture.detectChanges();
    expect(cards()[0].textContent).toContain('Carregando equipamentos');
    expect(cards()[0].textContent).not.toContain('Nenhum equipamento cadastrado');
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(cards()[0].textContent).toContain('Não foi possível conectar');
    expect(cards()[0].textContent).not.toContain('Nenhum equipamento cadastrado');
    elemento().querySelector<HTMLButtonElement>('.lista-salas__estado--erro button')!.click();
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).flush({ content: [], page: 0, totalPages: 0 });
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
      { provide: BACKEND_CONFIG, useValue: { url: BASE, modulos: ['salas', 'alocacoes', 'recursos-salas'], agendaSalasCompleta: true } },
      { provide: RelogioService, useValue: { agora: () => new Date('2026-10-07T13:00:00-03:00') } },
      { provide: SalasLocaisService, useValue: { salas: signal([]), catalogo: signal(null), erro: signal(null), carregando: signal(false), carregar: () => {} } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('avisa sobre falha da agenda e permite repetir somente essa consulta', fakeAsync(() => {
    const fixture = TestBed.createComponent(ListaSalas); tick(0);
    http.expectOne(r => r.url === `${BASE}/salas`).flush({ content: [sala(1, 'LAB-01', 'Laboratório')], page: 0, totalPages: 1 });
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).flush({ content: [], page: 0, totalPages: 0 });
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
    http.expectNone(r => r.url === `${BASE}/salas` || r.url === `${BASE}/recursos-salas`);
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
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    expect(tela.querySelectorAll('[role="alert"]').length).toBe(1);
    const aviso = tela.querySelector('[role="alert"]')!;
    expect(aviso.textContent).toContain('cadastro, disponibilidade, equipamentos');
    expect(aviso.textContent?.match(/Não foi possível conectar ao servidor/g)?.length).toBe(1);
    expect(tela.querySelector('.lista-salas__vazio')).toBeNull();
    aviso.querySelector<HTMLButtonElement>('button')!.click();
    http.expectOne(r => r.url === `${BASE}/salas`).flush({ content: [sala(1, 'LAB-01', 'Laboratório')], page: 0, totalPages: 1 });
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).flush({ content: [], page: 0, totalPages: 0 });
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
    http.expectOne(r => r.url === `${BASE}/recursos-salas`).flush(null, { status: 401, statusText: 'Unauthorized' });
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
