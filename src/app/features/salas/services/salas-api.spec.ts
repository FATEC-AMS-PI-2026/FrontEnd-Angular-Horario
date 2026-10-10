import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SalasApiService } from './salas-api';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';

describe('SalasApiService', () => {
  let service: SalasApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_CONFIG, useValue: { habilitado: false, url: 'https://backend.test/', modulos: ['salas'] } },
      ],
    });
    service = TestBed.inject(SalasApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca GET /salas e converte para o formato da tela', () => {
    service.carregar();
    expect(service.carregando()).toBeTrue();

    const req = http.expectOne((r) => r.url === 'https://backend.test/salas');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('200');
    req.flush({
      content: [{ id: 7, codigo: 'REUN-01', capacidade: 12, tipoSala: { id: 4, nome: 'Sala de Reuniao' } }],
      page: 0, size: 200, totalElements: 1, totalPages: 1,
    });

    expect(service.carregando()).toBeFalse();
    expect(service.erro()).toBeNull();
    expect(service.salas()).toEqual([{ id: 7, nome: 'REUN-01', capacidade: 12, tipo: 'Sala de Reuniao', predio: 'Prédio 1' }]);
  });

  it('mantém Auditório sem prédio pelo código AUD mesmo com tipo Sala, ou pelo nome/tipo', () => {
    service.carregar();
    http.expectOne(r => r.url === 'https://backend.test/salas').flush({ content: [
      { id: 1, codigo: 'AUD-01', capacidade: 120, tipoSala: { id: 2, nome: 'Sala' } },
      { id: 2, codigo: 'auditorio', capacidade: 100, tipoSala: { id: 2, nome: 'Espaço' } },
      { id: 3, codigo: 'ESPACO-01', capacidade: 100, tipoSala: { id: 3, nome: 'Auditório' } },
    ], page: 0, totalPages: 1 });
    expect(service.salas().every(sala => sala.predio === undefined)).toBeTrue();

    service.obterPorId(1).subscribe(sala => expect(sala.predio).toBeUndefined());
    http.expectOne('https://backend.test/salas/1').flush({
      id: 1, codigo: 'AUD-01', capacidade: 120, tipoSala: { id: 2, nome: 'Sala' },
    });
  });

  it('expõe uma mensagem amigável quando o backend está fora do ar', () => {
    service.carregar();
    http.expectOne((r) => r.url === 'https://backend.test/salas').error(new ProgressEvent('error'), { status: 0 });

    expect(service.carregando()).toBeFalse();
    expect(service.erro()).toContain('Não foi possível conectar ao servidor');
  });

  it('carrega todas as páginas e só publica a lista completa', () => {
    const sala = { id: 1, codigo: 'LAB-01', capacidade: 40, tipoSala: { id: 1, nome: 'Laboratório' } };
    service.carregar();
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [sala], page: 0, totalPages: 2 });
    expect(service.salas()).toEqual([]);
    expect(service.carregando()).toBeTrue();
    http.expectOne(r => r.params.get('page') === '1').flush({ content: [{ ...sala, id: 2, codigo: 'LAB-02' }], page: 1, totalPages: 2 });
    expect(service.salas().map(s => s.nome)).toEqual(['LAB-01', 'LAB-02']);
    expect(service.carregando()).toBeFalse();
  });

  it('descarta páginas parciais em falhas e cancela consultas substituídas', () => {
    service.carregar();
    const antiga = http.expectOne(r => r.params.get('page') === '0');
    service.carregar();
    expect(antiga.cancelled).toBeTrue();
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [{ id: 1 }], page: 0, totalPages: 2 });
    http.expectOne(r => r.params.get('page') === '1').error(new ProgressEvent('error'));
    expect(service.salas()).toEqual([]);
    expect(service.erro()).toBeTruthy();
    service.carregar();
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [], page: 0, totalPages: 0 });
    expect(service.erro()).toBeNull();
    expect(service.carregando()).toBeFalse();
  });

  it('trata paginação e cadastros inválidos como erro, não como uma lista vazia válida', () => {
    service.carregar();
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [], page: 0, totalPages: 2 });
    expect(service.erro()).toBeTruthy();
    service.carregar();
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [{ id: 1 }], page: 0, totalPages: 1 });
    expect(service.erro()).toBeTruthy();
    expect(service.salas()).toEqual([]);
  });
});
