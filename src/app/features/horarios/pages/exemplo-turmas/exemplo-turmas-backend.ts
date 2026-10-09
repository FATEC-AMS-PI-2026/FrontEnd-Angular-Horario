import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, mergeMap, of, throwError, timer } from 'rxjs';

// TEMPORÁRIO: exemplo solicitado para visualizar o PR 37, somente no desenvolvimento.
// As respostas ilustrativas ficam neste transporte isolado; o Service/mapeadores são os reais.
// Remover esta página e seu transporte quando o exemplo não for mais necessário.
export const CURSOS_EXEMPLO = [
  { id: 1, nome: 'Curso A (exemplo)' },
  { id: 2, nome: 'Curso B (exemplo)' },
];

const TURMAS = [
  { id: 101, codigo: 'Turma A1', periodo: 1, ano: 2026, curso: { id: 1, nome: CURSOS_EXEMPLO[0].nome, status: 'ATIVO' } },
  { id: 102, codigo: 'Turma A2', periodo: 2, ano: 2026, curso: { id: 1, nome: CURSOS_EXEMPLO[0].nome, status: 'ATIVO' } },
  { id: 201, codigo: 'Turma B1', periodo: 1, ano: 2026, curso: { id: 2, nome: CURSOS_EXEMPLO[1].nome, status: 'ATIVO' } },
];

const ALOCACOES = [
  { turma: TURMAS[0], diaSemana: 'SEGUNDA', disciplina: { nome: 'Programação (exemplo)' }, professor: { nome: 'Docente do exemplo' }, sala: { codigo: 'Sala EX-01' }, blocoHorario: { horaInicio: '13:20:00', horaFim: '14:10:00' }, quadroHorario: { status: 'ATIVO' } },
  { turma: TURMAS[0], dia_semana: 'SEGUNDA', disciplina: { nome: 'Banco de dados (exemplo)' }, professor: null, sala: { codigo: 'Sala EX-02' }, bloco_horario: { hora_inicio: '14:20:00', hora_fim: '15:10:00' }, quadro_horario: { status: 'ATIVO' } },
  { turma: TURMAS[1], diaSemana: 'TERCA', disciplina: { nome: 'Projeto (exemplo)' }, professor: null, sala: { codigo: 'Sala EX-03' }, blocoHorario: { horaInicio: '14:00:00', horaFim: '15:00:00' }, quadroHorario: { status: 'ATIVO' } },
  { turma: TURMAS[2], diaSemana: 'SABADO', disciplina: { nome: 'Oficina (exemplo)' }, professor: { nome: 'Docente do exemplo' }, sala: { codigo: 'Sala EX-04' }, blocoHorario: { horaInicio: '09:00:00', horaFim: '10:00:00' }, quadroHorario: { status: 'ATIVO' } },
];

@Injectable()
export class ExemploTurmasBackend extends HttpBackend {
  readonly falharTurmas = signal(false);
  readonly consultas = signal<{ caminho: string; status: number }[]>([]);

  override handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    // Pequeno tempo de resposta para apresentar o carregamento e permitir cancelamento.
    return timer(100).pipe(mergeMap(() => {
      const rota = req.url.split('/').pop();
      const status = req.method !== 'GET' || !['turmas', 'alocacoes'].includes(rota ?? '')
        ? 404 : rota === 'turmas' && this.falharTurmas() ? 500 : 200;
      this.consultas.update(consultas => [...consultas, { caminho: req.urlWithParams.replace('/exemplo-api', ''), status }]);
      if (status !== 200) return throwError(() => new HttpErrorResponse({ status, url: req.url }));

      const curso = req.params.get('curso');
      const turma = req.params.get('turma');
      const registros = rota === 'turmas'
        ? TURMAS.filter(item => !curso || item.curso.id === Number(curso))
        : ALOCACOES.filter(item => !turma || item.turma.id === Number(turma));
      const page = Number(req.params.get('page') ?? 0);
      // Uma linha por página evidencia que o Service reúne a resposta completa.
      return of(new HttpResponse({ status: 200, body: {
        content: registros.slice(page, page + 1), page, size: 1,
        totalPages: registros.length, totalElements: registros.length,
      } }));
    }));
  }
}
