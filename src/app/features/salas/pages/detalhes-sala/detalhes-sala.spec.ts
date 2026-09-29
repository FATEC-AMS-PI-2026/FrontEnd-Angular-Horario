import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { DetalhesSala } from './detalhes-sala';
import { BACKEND_CONFIG } from '../../../../core/services/backend-config';
import { backendInterceptor } from '../../../../core/services/backend.interceptor';
import { RelogioService } from '../../services/relogio';

const sala = { id: 73, codigo: 'LAB-REAL', capacidade: 32, tipoSala: { id: 2, nome: 'Laboratório' } };

describe('DetalhesSala', () => {
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let config: { url: string; habilitado: boolean; modulos: string[]; agendaSalasCompleta: boolean };
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ id: '73' }));
    config = { url: 'http://backend', habilitado: false, modulos: ['salas', 'alocacoes'], agendaSalasCompleta: true };
    TestBed.configureTestingModule({ imports: [DetalhesSala], providers: [
      provideRouter([]), provideHttpClient(withInterceptors([backendInterceptor])), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: BACKEND_CONFIG, useValue: config },
      { provide: RelogioService, useValue: { agora: () => new Date('2026-09-24T13:20:00-03:00') } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('busca o ID real e mostra dados e disponibilidade sem os mocks', fakeAsync(() => {
    const fixture = TestBed.createComponent(DetalhesSala); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando sala');
    http.expectOne('http://backend/salas/73').flush(sala); tick(0);
    http.expectOne(r => r.url.endsWith('/alocacoes')).flush({ content: [{
      id: 1, sala: { id: 73 }, diaSemana: 'QUINTA', blocoHorario: { horaInicio: '15:00:00', horaFim: '16:00:00' },
      quadroHorario: { status: 'ATIVO', periodoAtividadeQuadro: { status: 'ATIVO', dataInicio: '2026-08-01', dataFim: '2026-12-20' } },
    }], page: 0, totalPages: 1 });
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('LAB-REAL'); expect(texto).toContain('32 pessoas');
    expect(texto).toContain('Livre até às 15:00');
    expect(texto).not.toContain('Ver alertas'); expect(texto).not.toContain('Bloco A');
    fixture.destroy();
  }));

  it('preserva cadastro e não afirma Livre quando a agenda falha', fakeAsync(() => {
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala); tick(0);
    http.expectOne(r => r.url.endsWith('/alocacoes')).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('LAB-REAL');
    expect(fixture.nativeElement.textContent).toContain('Disponibilidade indisponível');
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    fixture.destroy();
  }));

  it('atualiza o badge com o relógio e invalida a disponibilidade se a atualização falha', fakeAsync(() => {
    let instante = new Date('2026-09-24T14:59:59-03:00');
    spyOn(TestBed.inject(RelogioService), 'agora').and.callFake(() => instante);
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala); tick(0);
    http.expectOne(r => r.url.endsWith('/alocacoes')).flush({ content: [{
      id: 1, sala: { id: 73 }, diaSemana: 'QUINTA', blocoHorario: { horaInicio: '15:00', horaFim: '16:00' },
      quadroHorario: { status: 'ATIVO', periodoAtividadeQuadro: { status: 'ATIVO', dataInicio: '2026-08-01', dataFim: '2026-12-20' } },
    }], page: 0, totalPages: 1 });
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Livre até às 15:00');
    instante = new Date('2026-09-24T15:00:00-03:00'); tick(1000); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Em uso');
    tick(59000);
    http.expectOne(r => r.url.endsWith('/alocacoes')).error(new ProgressEvent('error'));
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    fixture.destroy(); tick(60000); http.expectNone(r => r.url.endsWith('/alocacoes'));
  }));

  it('trata 404 e permite tentar novamente', fakeAsync(() => {
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Sala não encontrada');
    fixture.nativeElement.querySelector('button').click();
    http.expectOne('http://backend/salas/73').error(new ProgressEvent('error'));
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Não foi possível conectar');
    fixture.destroy();
  }));

  it('cancela a requisição anterior ao mudar de sala e rejeita ID inválido', fakeAsync(() => {
    const fixture = TestBed.createComponent(DetalhesSala);
    const anterior = http.expectOne('http://backend/salas/73');
    params.next(convertToParamMap({ id: '91' })); expect(anterior.cancelled).toBeTrue();
    http.expectOne('http://backend/salas/91').flush({ ...sala, id: 91, codigo: 'SALA-91' }); tick(0);
    const agenda = http.expectOne(r => r.params.get('sala') === '91');
    params.next(convertToParamMap({ id: 'abc' })); expect(agenda.cancelled).toBeTrue();
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Identificador inválido');
    expect(fixture.nativeElement.textContent).not.toContain('SALA-91'); fixture.destroy();
  }));

  it('não consulta nem calcula disponibilidade quando o acesso à agenda é parcial', fakeAsync(() => {
    config.agendaSalasCompleta = false;
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala); tick(0); fixture.detectChanges();
    http.expectNone(r => r.url.endsWith('/alocacoes'));
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull(); fixture.destroy();
  }));

  it('respeita backend desabilitado sem módulos liberados', fakeAsync(() => {
    config.modulos = [];
    const fixture = TestBed.createComponent(DetalhesSala); fixture.detectChanges();
    http.expectNone('http://backend/salas/73');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull(); fixture.destroy();
  }));
});
