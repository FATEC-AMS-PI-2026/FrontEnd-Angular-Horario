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

  it('busca GET /salas pedindo tudo numa página e converte para o formato da tela', () => {
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
    expect(service.salas()).toEqual([{ id: 7, nome: 'REUN-01', capacidade: 12, tipo: 'Sala de Reuniao' }]);
  });

  it('expõe uma mensagem amigável quando o backend está fora do ar', () => {
    service.carregar();
    http.expectOne((r) => r.url === 'https://backend.test/salas').error(new ProgressEvent('error'), { status: 0 });

    expect(service.carregando()).toBeFalse();
    expect(service.erro()).toContain('Não foi possível conectar ao servidor');
  });
});
