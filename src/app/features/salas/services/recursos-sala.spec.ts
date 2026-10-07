import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { RecursosSalaService, equipamentoDoRecurso } from './recursos-sala';
import { RecursoSalaApi } from '../models/recurso-sala';

const recurso = (id = 1, sala = 7): RecursoSalaApi => ({ id, sala: { id: sala },
  recurso: { id, nome: 'Computador desktop', tipo: { id: 1, nome: 'Equipamento' } }, quantidade: 40 });

describe('RecursosSalaService', () => {
  let service: RecursosSalaService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RecursosSalaService, provideHttpClient(), provideHttpClientTesting(),
      { provide: BACKEND_CONFIG, useValue: { url: 'http://backend/', modulos: ['recurso-sala'] } }] });
    service = TestBed.inject(RecursosSalaService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lê todas as páginas, agrupa por sala e não inventa quantidade disponível', () => {
    service.carregar();
    const primeira = http.expectOne(r => r.params.get('page') === '0');
    expect(primeira.request.url).toBe('http://backend/recurso-sala');
    expect(primeira.request.params.has('salaId')).toBeFalse();
    primeira.flush({ content: [recurso()], page: 0, totalPages: 2 });
    expect(service.porSala().size).toBe(0);
    expect(service.daSala(7)).toBeNull();
    http.expectOne(r => r.params.get('page') === '1').flush({ content: [recurso(2, 8)], page: 1, totalPages: 2 });
    expect(service.porSala().size).toBe(2);
    expect(service.porSala().get(7)![0].quantidadeTotal).toBe(40);
    expect(service.porSala().get(7)![0].quantidadeDisponivel).toBeUndefined();
    expect(service.carregando()).toBeFalse();
  });

  it('usa salaId no filtro e não associa itens de outra sala', () => {
    service.carregar(7);
    http.expectOne(r => r.params.get('salaId') === '7').flush({ content: [recurso(), recurso(2, 8)], page: 0, totalPages: 1 });
    expect([...service.porSala().keys()]).toEqual([7]);
  });

  it('descarta resultado parcial e permite nova tentativa após erro', () => {
    service.carregar(7);
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [recurso()], page: 0, totalPages: 2 });
    http.expectOne(r => r.params.get('page') === '1').flush({}, { status: 500, statusText: 'Error' });
    expect(service.porSala().size).toBe(0);
    expect(service.erro()).toBeTruthy();
    expect(service.daSala(7)).toBeNull();
    service.carregar(7);
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [], page: 0, totalPages: 0 });
    expect(service.erro()).toBeNull();
    expect(service.carregando()).toBeFalse();
    expect(service.daSala(7)).toEqual([]);
  });

  it('cancela a consulta anterior ao trocar de sala ou limpar', () => {
    service.carregar(7);
    const anterior = http.expectOne(r => r.params.get('salaId') === '7');
    service.carregar(8);
    expect(anterior.cancelled).toBeTrue();
    const atual = http.expectOne(r => r.params.get('salaId') === '8');
    service.limpar();
    expect(atual.cancelled).toBeTrue();
    expect(service.porSala().size).toBe(0);
  });

  it('rejeita paginação inconsistente e quantidades inválidas', () => {
    service.carregar();
    http.expectOne(r => r.url.endsWith('/recurso-sala')).flush({ content: [], page: 0, totalPages: 2 });
    expect(service.erro()).toBeTruthy();
    service.carregar();
    http.expectOne(r => r.url.endsWith('/recurso-sala')).flush({ content: [{ ...recurso(), quantidade: -1 }], page: 0, totalPages: 1 });
    expect(service.erro()).toBeTruthy();
    expect(service.porSala().size).toBe(0);
  });

  it('preserva nomes, categorias e zero sem transformar projetor em televisão', () => {
    const item = recurso();
    item.recurso.nome = 'Projetor multimidia'; item.quantidade = 0;
    expect(equipamentoDoRecurso(item)).toEqual({ id: 1, tipo: 'Projetor multimidia', nome: 'Projetor multimidia', categoria: 'Equipamento', quantidadeTotal: 0 });
  });

  it('respeita o módulo desabilitado sem consultar nem declarar ausência de equipamentos', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [RecursosSalaService, provideHttpClient(), provideHttpClientTesting(),
      { provide: BACKEND_CONFIG, useValue: { url: 'http://backend/', habilitado: false, modulos: ['salas'] } }] });
    const desabilitado = TestBed.inject(RecursosSalaService);
    desabilitado.carregar(7);
    expect(desabilitado.daSala(7)).toBeNull();
    expect(desabilitado.carregando()).toBeFalse();
    TestBed.inject(HttpTestingController).expectNone(r => r.url.endsWith('/recurso-sala'));
  });
});
