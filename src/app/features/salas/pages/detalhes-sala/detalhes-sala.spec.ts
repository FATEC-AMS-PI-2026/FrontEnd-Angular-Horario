import { signal, WritableSignal } from '@angular/core';
import { SalaResumo } from '../../models/sala-resumo';
import { TopbarContextService } from '../../../../core/services/topbar-context.service';
import { SalasLocaisService } from '../../services/salas-locais';
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
    config = { url: 'http://backend', habilitado: false, modulos: ['salas', 'alocacoes', 'recurso-sala'], agendaSalasCompleta: true };
    TestBed.configureTestingModule({ imports: [DetalhesSala], providers: [
      provideRouter([]),
      { provide: SalasLocaisService, useValue: { salas: signal([]), catalogo: signal(null), erro: signal(null), carregando: signal(false), carregar: () => {} } }, provideHttpClient(withInterceptors([backendInterceptor])), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: BACKEND_CONFIG, useValue: config },
      { provide: RelogioService, useValue: { agora: () => new Date('2026-09-24T13:20:00-03:00') } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    for (const request of http.match(r => r.url.endsWith('/recurso-sala'))) {
      if (!request.cancelled) request.flush({ content: [], page: 0, totalPages: 0 });
    }
    http.verify();
  });

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
    expect(texto).toContain('LAB-REAL'); expect(texto).toContain('Capacidade de alunos: 32');
    expect(texto).toContain('Livre até às 15:00');
    expect(texto).not.toContain('Ver alertas'); expect(texto).not.toContain('Bloco A');
    expect(texto).toContain('Prédio 1'); expect(texto).not.toContain('Andar:');
    expect(texto).not.toContain('Técnico:');
    expect(fixture.nativeElement.querySelector('app-equipamentos-card')).not.toBeNull();
    expect(texto).toContain('Carregando equipamentos');
    expect(texto).not.toContain('Nenhum equipamento cadastrado');
    expect(fixture.nativeElement.querySelector('app-tecnico-card')).toBeNull();
    http.expectOne(r => r.url.endsWith('/recurso-sala')).flush({ content: [], page: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum equipamento cadastrado');
    expect(fixture.nativeElement.querySelector('.equipamento__quantidade')).toBeNull();
    expect(TestBed.inject(TopbarContextService).sala()).toBe('LAB-REAL');
    fixture.destroy();
    expect(TestBed.inject(TopbarContextService).sala()).toBeNull();
  }));

  it('exibe os detalhes do Auditório sem prédio ou andar', fakeAsync(() => {
    config.agendaSalasCompleta = false;
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush({ ...sala, codigo: 'AUD-01', tipoSala: { id: 3, nome: 'Auditório' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-cabecalho-sala').textContent).toContain('Auditório');
    expect(fixture.nativeElement.querySelector('.cabecalho-sala__badge')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Prédio');
    fixture.destroy();
  }));

  it('preserva cadastro e não afirma Livre quando a agenda falha', fakeAsync(() => {
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala); tick(0);
    http.expectOne(r => r.url.endsWith('/alocacoes')).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('LAB-REAL');
    expect(fixture.nativeElement.textContent).toContain('Disponibilidade indisponível');
    expect(fixture.nativeElement.querySelector('app-proximos-horarios-card').textContent).toContain('Não foi possível consultar');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhuma outra aula cadastrada');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhuma aula cadastrada para esta sala');
    expect(fixture.nativeElement.querySelector('.proximo-horario--vazio')).toBeNull();
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
    const vazio = fixture.nativeElement.querySelector('.proximo-horario--vazio');
    expect(vazio.textContent).toContain('Sala vazia');
    expect(vazio.textContent).toContain('16:00');
    expect(vazio.textContent).toContain('21:30');
    expect(fixture.nativeElement.querySelector('app-aulas-do-dia-card').textContent).not.toContain('Nenhuma aula cadastrada para esta sala');
    tick(59000);
    http.expectOne(r => r.url.endsWith('/alocacoes')).error(new ProgressEvent('error'));
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.proximo-horario--vazio')).toBeNull();
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

  it('oculta pausas de 10 e 30 minutos no card, mas mantém a lacuna de 31 minutos', fakeAsync(() => {
    let instante = new Date('2026-09-24T13:20:00-03:00');
    spyOn(TestBed.inject(RelogioService), 'agora').and.callFake(() => instante);
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala); tick(0);
    const aulas = [['13:20', '15:00'], ['15:10', '16:00'], ['16:30', '17:00'], ['17:31', '18:00']];
    http.expectOne(r => r.url.endsWith('/alocacoes')).flush({ content: aulas.map(([inicio, termino], i) => ({
      id: i + 1, sala: { id: 73 }, diaSemana: 'QUINTA', disciplina: { nome: `Disciplina ${i + 1}` },
      blocoHorario: { horaInicio: inicio, horaFim: termino },
      quadroHorario: { status: 'ATIVO', periodoAtividadeQuadro: { status: 'ATIVO', dataInicio: '2026-08-01', dataFim: '2026-12-20' } },
    })), page: 0, totalPages: 1 });
    fixture.detectChanges();
    const tela: HTMLElement = fixture.nativeElement;
    const vazios = () => Array.from(tela.querySelectorAll('.proximo-horario--vazio'), elemento =>
      Array.from(elemento.querySelectorAll('.proximo-horario__horario span'), span => span.textContent));
    expect(vazios()).toEqual([['17:00', '17:31'], ['18:00', '21:30']]);
    instante = new Date('2026-09-24T15:05:00-03:00'); tick(1000); fixture.detectChanges();
    expect(vazios()).toEqual([['17:00', '17:31'], ['18:00', '21:30']]);
    expect(fixture.nativeElement.querySelector('app-proximos-horarios-card').textContent).toContain('Disciplina 2');
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
    expect(fixture.nativeElement.querySelector('.proximo-horario--vazio')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull(); fixture.destroy();
  }));

  it('respeita backend desabilitado sem módulos liberados', fakeAsync(() => {
    config.modulos = [];
    const fixture = TestBed.createComponent(DetalhesSala); fixture.detectChanges();
    http.expectNone('http://backend/salas/73');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull(); fixture.destroy();
  }));

  it('abre uma sala local sem confundir seu ID com o Java e mantém campos ausentes vazios', fakeAsync(() => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.salas as WritableSignal<SalaResumo[]>).set([{ id: 73, nome: 'LAB LOCAL', rotaId: 'local-73', origem: 'local' }]);
    params.next(convertToParamMap({ id: 'local-73' }));
    const fixture = TestBed.createComponent(DetalhesSala); fixture.detectChanges(); tick(0); fixture.detectChanges();
    http.expectNone(r => r.url.startsWith('http://backend'));
    expect(fixture.nativeElement.textContent).toContain('LAB LOCAL');
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-tecnico-card')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Informação de equipamentos não disponível');
    expect(fixture.nativeElement.querySelector('.cabecalho-sala__resumo strong').textContent.trim()).toBe('');
    fixture.destroy();
  }));

  it('carrega recursos por sala e permite recuperar a falha sem perder o cadastro', fakeAsync(() => {
    config.agendaSalasCompleta = false;
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala);
    http.expectOne(r => r.url.endsWith('/recurso-sala') && r.params.get('salaId') === '73')
      .error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('LAB-REAL');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum equipamento cadastrado');
    fixture.nativeElement.querySelector('[aria-label="Tentar consultar equipamentos novamente"]').click();
    http.expectOne(r => r.url.endsWith('/recurso-sala')).flush({ page: 0, totalPages: 1, content: [
      { id: 1, sala: { id: 73 }, recurso: { id: 2, nome: 'Computador desktop', tipo: { id: 1, nome: 'Equipamento' } }, quantidade: 40 },
    ] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Computador desktop');
    expect(fixture.nativeElement.querySelector('.equipamento__quantidade').textContent.trim()).toBe('40');
    expect(fixture.nativeElement.querySelector('.equipamento__quantidade--total')).toBeNull();
    params.next(convertToParamMap({ id: 'local-73' })); tick(0); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Computador desktop');
    fixture.destroy();
  }));

  it('cancela recursos pendentes ao navegar para outra sala', fakeAsync(() => {
    config.agendaSalasCompleta = false;
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala);
    const anterior = http.expectOne(r => r.params.get('salaId') === '73');
    params.next(convertToParamMap({ id: '91' }));
    expect(anterior.cancelled).toBeTrue();
    http.expectOne('http://backend/salas/91').flush({ ...sala, id: 91, codigo: 'SALA-91' });
    http.expectOne(r => r.params.get('salaId') === '91').flush({ content: [], page: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SALA-91');
    expect(fixture.nativeElement.textContent).toContain('Nenhum equipamento cadastrado');
    fixture.destroy();
  }));

  it('confirma Sala vazia somente após consultar a agenda e o catálogo local', fakeAsync(() => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.carregando as WritableSignal<boolean>).set(true);
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala); tick(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-proximos-horarios-card').textContent).toContain('Carregando próximos horários');
    expect(fixture.nativeElement.querySelector('.proximo-horario--vazio')).toBeNull();
    http.expectOne(r => r.url.endsWith('/alocacoes')).flush({ content: [], page: 0, totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhuma outra aula cadastrada');
    expect(fixture.nativeElement.querySelector('.proximo-horario--vazio')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    (locais.carregando as WritableSignal<boolean>).set(false); fixture.detectChanges();
    const vazio = fixture.nativeElement.querySelector('.proximo-horario--vazio');
    expect(vazio.textContent).toContain('Sala vazia');
    expect(vazio.textContent).toContain('13:20');
    expect(vazio.textContent).toContain('21:30');
    expect(fixture.nativeElement.textContent).toContain('Nenhuma aula cadastrada para esta sala hoje.');
    (locais.erro as WritableSignal<string | null>).set('Falha na consulta do navegador'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhuma outra aula cadastrada');
    expect(fixture.nativeElement.querySelector('.proximo-horario--vazio')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    fixture.destroy();
  }));

  it('não apresenta horários inválidos do Java como ausência de aulas', fakeAsync(() => {
    const fixture = TestBed.createComponent(DetalhesSala);
    http.expectOne('http://backend/salas/73').flush(sala); tick(0);
    http.expectOne(r => r.url.endsWith('/alocacoes')).flush({ content: [{
      id: 1, sala: { id: 73 }, diaSemana: 'QUINTA', blocoHorario: { horaInicio: '16:00', horaFim: '15:00' },
      quadroHorario: { status: 'ATIVO', periodoAtividadeQuadro: { status: 'ATIVO', dataInicio: '2026-08-01', dataFim: '2026-12-20' } },
    }], page: 0, totalPages: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('horários inválidos');
    expect(fixture.nativeElement.querySelector('.proximo-horario--vazio')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhuma outra aula cadastrada');
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    fixture.destroy();
  }));
});
