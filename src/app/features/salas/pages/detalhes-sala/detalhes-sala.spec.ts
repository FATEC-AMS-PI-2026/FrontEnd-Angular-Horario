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
    config = { url: 'http://backend', habilitado: false, modulos: ['salas', 'alocacoes'], agendaSalasCompleta: true };
    TestBed.configureTestingModule({ imports: [DetalhesSala], providers: [
      provideRouter([]),
      { provide: SalasLocaisService, useValue: { salas: signal([]), catalogo: signal(null), erro: signal(null), carregando: signal(false), carregar: () => {} } }, provideHttpClient(withInterceptors([backendInterceptor])), provideHttpClientTesting(),
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
    expect(texto).toContain('LAB-REAL'); expect(texto).toContain('Capacidade de alunos: 32');
    expect(texto).toContain('Livre até às 15:00');
    expect(texto).not.toContain('Ver alertas'); expect(texto).not.toContain('Bloco A');
    expect(fixture.nativeElement.querySelector('app-equipamentos-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.equipamento__quantidade').textContent.trim()).toBe('');
    expect(TestBed.inject(TopbarContextService).sala()).toBe('LAB-REAL');
    fixture.destroy();
    expect(TestBed.inject(TopbarContextService).sala()).toBeNull();
  }));

  describe('equipamentos vindos de /recurso-sala (#149)', () => {
    function abrir() {
      config.modulos = ['salas', 'alocacoes', 'recurso-sala'];
      config.agendaSalasCompleta = false;
      const fixture = TestBed.createComponent(DetalhesSala); fixture.detectChanges();
      const recursos = http.expectOne(r => r.url === 'http://backend/recurso-sala');
      expect(recursos.request.params.get('salaId')).toBe('73');
      http.expectOne('http://backend/salas/73').flush(sala); tick(0);
      fixture.detectChanges();
      return { fixture, recursos };
    }

    it('lista os recursos reais da sala com nome, tipo e quantidade', fakeAsync(() => {
      const { fixture, recursos } = abrir();
      expect(fixture.nativeElement.textContent).toContain('Carregando equipamentos');
      recursos.flush({ content: [
        { id: 1, quantidade: 40, recurso: { id: 2, nome: 'Computador desktop', tipo: { id: 1, nome: 'Equipamento' } } },
        { id: 2, quantidade: 1, recurso: { id: 1, nome: 'Projetor multimidia', tipo: { id: 1, nome: 'Equipamento' } } },
      ], page: 0, totalPages: 1 });
      fixture.detectChanges();
      const card: HTMLElement = fixture.nativeElement.querySelector('app-equipamentos-card');
      expect(card.textContent).toContain('Computador desktop');
      expect(card.textContent).toContain('Projetor multimidia');
      expect(card.textContent).not.toContain('Wi-fi');
      const quantidades = Array.from(card.querySelectorAll('.equipamento__quantidade')).map(q => q.textContent?.trim());
      expect(quantidades).toEqual(['40', '1']);
      expect(card.querySelector('img')?.getAttribute('src')).toBe('/icons/salas/computador.png');
    }));

    it('avisa quando a sala não tem recurso cadastrado', fakeAsync(() => {
      const { fixture, recursos } = abrir();
      recursos.flush({ content: [], page: 0, totalPages: 0 });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Nenhum equipamento cadastrado');
      expect(fixture.nativeElement.querySelector('.equipamento__quantidade')).toBeNull();
    }));

    it('mostra erro só no card quando a consulta de recursos falha', fakeAsync(() => {
      const { fixture, recursos } = abrir();
      recursos.flush({}, { status: 500, statusText: 'Erro' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-equipamentos-card [role="alert"]')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('LAB-REAL');
    }));
  });

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

  it('abre uma sala local sem confundir seu ID com o Java e mantém campos ausentes vazios', fakeAsync(() => {
    const locais = TestBed.inject(SalasLocaisService);
    (locais.salas as WritableSignal<SalaResumo[]>).set([{ id: 73, nome: 'LAB LOCAL', rotaId: 'local-73', origem: 'local' }]);
    params.next(convertToParamMap({ id: 'local-73' }));
    const fixture = TestBed.createComponent(DetalhesSala); fixture.detectChanges(); tick(0); fixture.detectChanges();
    http.expectNone(r => r.url.startsWith('http://backend'));
    expect(fixture.nativeElement.textContent).toContain('LAB LOCAL');
    expect(fixture.nativeElement.querySelector('app-status-sala-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tecnico-card__avatar').textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('.cabecalho-sala__resumo strong').textContent.trim()).toBe('');
    fixture.destroy();
  }));
});
