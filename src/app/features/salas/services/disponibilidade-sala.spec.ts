import { calcularDisponibilidade, AlocacaoSalaApi, DisponibilidadeSalaService } from './disponibilidade-sala';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';

const agora = (hora: string) => new Date(`2026-09-24T${hora}-03:00`);
function aula(inicio = '15:00:00', fim = '16:40:00'): AlocacaoSalaApi {
  return { id: 1, sala: { id: 7 }, diaSemana: 'QUINTA',
    blocoHorario: { horaInicio: inicio, horaFim: fim },
    quadroHorario: { status: 'ATIVO', periodoAtividadeQuadro: {
      status: 'ATIVO', dataInicio: '2026-08-01', dataFim: '2026-12-20',
    } } };
}

describe('Disponibilidade da sala', () => {
  it('usa São Paulo, ordena e considera somente a sala selecionada', () => {
    const outra = aula('13:00', '17:00'); outra.sala.id = 8;
    expect(calcularDisponibilidade(7, [aula('17:00', '18:00'), outra, aula()], agora('13:20:00')))
      .toEqual({ status: 'Livre', texto: 'Livre até às 15:00' });
  });
  it('inclui início, exclui fim e trata aulas consecutivas', () => {
    expect(calcularDisponibilidade(7, [aula()], agora('15:00:00')).status).toBe('Em uso');
    expect(calcularDisponibilidade(7, [aula()], agora('16:40:00')).texto).toContain('sem mais aulas hoje');
    expect(calcularDisponibilidade(7, [aula(), aula('16:40', '18:00')], agora('16:40:00')).status).toBe('Em uso');
  });
  it('não afirma um horário limite sem próxima aula', () => {
    expect(calcularDisponibilidade(7, [], agora('13:00:00')).texto).toBe('Livre — sem mais aulas hoje');
  });
  it('ignora outros dias, grades inativas e fora da vigência', () => {
    const ontem = aula(); ontem.diaSemana = 'QUARTA';
    const inativa = aula(); inativa.quadroHorario.status = 'INATIVO';
    const vencida = aula(); vencida.quadroHorario.periodoAtividadeQuadro.dataFim = '2026-09-23';
    const futura = aula(); futura.quadroHorario.periodoAtividadeQuadro.dataInicio = '2026-09-25';
    expect(calcularDisponibilidade(7, [ontem, inativa, vencida, futura], agora('15:10:00')).status).toBe('Livre');
  });
  it('recusa horários inválidos e vigência incompleta', () => {
    expect(calcularDisponibilidade(7, [aula('inválido')], agora('13:00:00')).status).toBeUndefined();
    const incompleta = aula(); incompleta.quadroHorario.periodoAtividadeQuadro.dataInicio = '';
    expect(calcularDisponibilidade(7, [incompleta], agora('13:00:00')).status).toBeUndefined();
  });
  it('reavalia a data na virada do dia de São Paulo', () => {
    const sexta = aula('00:00', '01:00'); sexta.diaSemana = 'SEXTA';
    expect(calcularDisponibilidade(7, [sexta], new Date('2026-09-25T02:59:59Z')).status).toBe('Livre');
    expect(calcularDisponibilidade(7, [sexta], new Date('2026-09-25T03:00:00Z')).status).toBe('Em uso');
  });
});

describe('DisponibilidadeSalaService', () => {
  let http: HttpTestingController;
  let service: DisponibilidadeSalaService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: BACKEND_CONFIG, useValue: { url: 'http://backend/', agendaSalasCompleta: true } }] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(DisponibilidadeSalaService);
  });
  afterEach(() => http.verify());
  it('só entrega a agenda após carregar todas as páginas filtradas por sala', () => {
    const recebido = jasmine.createSpy();
    service.carregar(7).subscribe(recebido);
    const primeira = http.expectOne(r => r.url.endsWith('/alocacoes') && r.params.get('page') === '0');
    expect(primeira.request.params.get('sala')).toBe('7');
    expect(primeira.request.params.has('usuario')).toBeFalse();
    primeira.flush({ content: [aula()], page: 0, totalPages: 2 });
    expect(recebido).not.toHaveBeenCalled();
    http.expectOne(r => r.params.get('page') === '1' && r.params.get('sala') === '7')
      .flush({ content: [{ ...aula('17:00', '18:00'), id: 2 }], page: 1, totalPages: 2 });
    expect(recebido.calls.mostRecent().args[0].length).toBe(2);
  });
  it('não entrega agenda parcial quando uma página falha', () => {
    const recebido = jasmine.createSpy(); const erro = jasmine.createSpy();
    service.carregar(7).subscribe({ next: recebido, error: erro });
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [aula()], page: 0, totalPages: 2 });
    http.expectOne(r => r.params.get('page') === '1').flush({}, { status: 500, statusText: 'Error' });
    expect(recebido).not.toHaveBeenCalled(); expect(erro).toHaveBeenCalled();
  });

  it('rejeita alocações sem sala, de outra sala ou duplicadas sem informar Livre', () => {
    for (const content of [
      [{ ...aula(), sala: null }], [{ ...aula(), sala: { id: 8 } }], [aula(), aula()],
    ]) {
      const recebido = jasmine.createSpy(); const erro = jasmine.createSpy();
      service.carregar(7).subscribe({ next: recebido, error: erro });
      http.expectOne(r => r.url.endsWith('/alocacoes')).flush({ content, page: 0, totalPages: 1 });
      expect(recebido).not.toHaveBeenCalled(); expect(erro).toHaveBeenCalled();
    }
  });

  it('rejeita paginação que muda durante a consulta ou declara zero páginas com alocações', () => {
    const erro = jasmine.createSpy(); const recebido = jasmine.createSpy();
    service.carregar().subscribe({ next: recebido, error: erro });
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [aula()], page: 0, totalPages: 2 });
    http.expectOne(r => r.params.get('page') === '1').flush({ content: [], page: 1, totalPages: 1 });
    expect(recebido).not.toHaveBeenCalled(); expect(erro).toHaveBeenCalledTimes(1);
    service.carregar().subscribe({ next: recebido, error: erro });
    http.expectOne(r => r.params.get('page') === '0').flush({ content: [aula()], page: 0, totalPages: 0 });
    expect(recebido).not.toHaveBeenCalled(); expect(erro).toHaveBeenCalledTimes(2);
  });
});
