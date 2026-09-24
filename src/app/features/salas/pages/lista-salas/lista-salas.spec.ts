import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ListaSalas } from './lista-salas';
import { BACKEND_CONFIG } from '../../../../core/services/backend-config';
import { SalaApi } from '../../models/sala-resumo';

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
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_CONFIG, useValue: { habilitado: false, url: BASE, modulos: ['salas'] } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaSalas);
    fixture.detectChanges();
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
    expect(cards()[1].querySelector('.card-sala__info')?.textContent).toContain('Sala · 50 lugares');
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
});
