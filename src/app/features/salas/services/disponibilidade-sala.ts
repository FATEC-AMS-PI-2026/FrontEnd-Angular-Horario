import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { PageResponse } from '../../../core/models/page-response';
import { StatusSala } from '../models/sala';
import { AulaDoDia } from '../models/aula-do-dia';

/** Recorte do AlocacaoResponse Java usado para disponibilidade da sala inteira. */
export interface AlocacaoSalaApi {
  id: number;
  disciplina?: { nome: string };
  professor?: { nome: string } | null;
  turma?: { codigo: string };
  sala: { id: number };
  diaSemana: string;
  blocoHorario: { horaInicio: string; horaFim: string };
  quadroHorario: {
    status: string;
    periodoAtividadeQuadro: { status: string; dataInicio: string; dataFim: string };
  };
}

export interface DisponibilidadeSala {
  status?: StatusSala;
  texto: string;
}

const DIAS = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];

export function momentoSaoPaulo(agora: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(agora);
  const valor = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  const data = `${valor('year')}-${valor('month')}-${valor('day')}`;
  return { data, dia: DIAS[new Date(`${data}T12:00:00Z`).getUTCDay()],
    segundos: +valor('hour') * 3600 + +valor('minute') * 60 + +valor('second') };
}

function segundos(horario: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(horario)) return NaN;
  const [h, m, s = 0] = horario.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

export function aulasJavaDaSala(salaId: number, agenda: AlocacaoSalaApi[], agora: Date): AulaDoDia[] {
  const m = momentoSaoPaulo(agora);
  return agenda.filter(a => a.sala?.id === salaId && a.diaSemana === m.dia &&
    a.quadroHorario?.status === 'ATIVO' && a.quadroHorario.periodoAtividadeQuadro?.status === 'ATIVO' &&
    a.quadroHorario.periodoAtividadeQuadro.dataInicio <= m.data &&
    m.data <= a.quadroHorario.periodoAtividadeQuadro.dataFim &&
    segundos(a.blocoHorario?.horaInicio ?? '') < segundos(a.blocoHorario?.horaFim ?? '')
  ).map(a => ({ inicio: a.blocoHorario.horaInicio.slice(0, 5), termino: a.blocoHorario.horaFim.slice(0, 5),
    disciplina: a.disciplina?.nome ?? '', professor: a.professor?.nome, turma: a.turma?.codigo ?? '', origem: 'java' as const }));
}

/** O Java prevalece nos intervalos em que as duas fontes informam aulas. */
export function unirAulas(java: AulaDoDia[], locais: AulaDoDia[]): AulaDoDia[] {
  return [...java, ...locais.filter(l => !java.some(j => j.inicio < l.termino && l.inicio < j.termino))]
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** Intervalos [início, fim); nunca deduz disponibilidade de uma agenda parcial. */
export function calcularDisponibilidade(salaId: number, alocacoes: AlocacaoSalaApi[], agora: Date, complementares: AulaDoDia[] = []): DisponibilidadeSala {
  const momento = momentoSaoPaulo(agora);
  const horarios: { inicio: number; fim: number; rotulo: string }[] = [];
  for (const aula of alocacoes) {
    if (aula.sala?.id !== salaId) continue;
    const quadro = aula.quadroHorario;
    const periodo = quadro?.periodoAtividadeQuadro;
    if (quadro?.status === 'INATIVO' || periodo?.status === 'INATIVO') continue;
    if (quadro?.status !== 'ATIVO' || periodo?.status !== 'ATIVO' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(periodo.dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(periodo.dataFim) ||
        periodo.dataInicio > periodo.dataFim || !DIAS.includes(aula.diaSemana)) {
      return { texto: 'Disponibilidade indisponível: horários incompletos.' };
    }
    if (momento.data < periodo.dataInicio || momento.data > periodo.dataFim || aula.diaSemana !== momento.dia) continue;
    const inicio = segundos(aula.blocoHorario?.horaInicio ?? '');
    const fim = segundos(aula.blocoHorario?.horaFim ?? '');
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
      return { texto: 'Disponibilidade indisponível: horários inválidos.' };
    }
    horarios.push({ inicio, fim, rotulo: aula.blocoHorario.horaInicio.slice(0, 5) });
  }
  // Aulas locais complementam a ocupação conhecida, mas nunca garantem agenda global sozinhas.
  for (const aula of complementares) {
    const inicio = segundos(aula.inicio), fim = segundos(aula.termino);
    if (Number.isFinite(inicio) && Number.isFinite(fim) && inicio < fim) {
      horarios.push({ inicio, fim, rotulo: aula.inicio.slice(0, 5) });
    }
  }
  if (horarios.some(h => h.inicio <= momento.segundos && momento.segundos < h.fim)) {
    return { status: 'Em uso', texto: 'Em uso' };
  }
  const proximo = horarios.filter(h => h.inicio > momento.segundos).sort((a, b) => a.inicio - b.inicio)[0];
  return proximo ? { status: 'Livre', texto: `Livre até às ${proximo.rotulo}` }
    : { status: 'Livre', texto: 'Livre — sem mais aulas hoje' };
}

@Injectable({ providedIn: 'root' })
export class DisponibilidadeSalaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(BACKEND_CONFIG);
  readonly agendaCompleta = this.config.agendaSalasCompleta === true;

  carregar(salaId?: number) {
    const pagina = (page: number) => this.http.get<PageResponse<AlocacaoSalaApi>>(
      `${this.config.url.replace(/\/+$/, '')}/alocacoes`, { params: { ...(salaId === undefined ? {} : { sala: salaId }), page, size: 200 } }).pipe(
        map(p => {
          if (p.page !== page || !Number.isInteger(p.totalPages) || p.totalPages < 0 ||
              !Array.isArray(p.content) || (p.totalPages > page + 1 && p.content.length === 0)) {
            throw new Error('Paginação incompleta da agenda da sala.');
          }
          return p;
        }),
      );
    return pagina(0).pipe(
      expand(p => p.page + 1 < p.totalPages ? pagina(p.page + 1) : EMPTY),
      map(p => p.content),
      reduce((todas, itens) => todas.concat(itens), [] as AlocacaoSalaApi[]),
    );
  }
}
