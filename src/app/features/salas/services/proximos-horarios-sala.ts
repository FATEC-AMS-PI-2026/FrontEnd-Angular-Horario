import { horarioAcademico } from '../../dashboard/models/grade-dia.model';
import { INTERVALO_MAXIMO_MIN } from '../../horarios/services/mapeadores-backend';
import { AulaDoDia } from '../models/aula-do-dia';
import { ProximoHorario } from '../models/proximo-horario';

const ABERTURA = 8 * 60;
const ENCERRAMENTO = 21 * 60 + 30;

function minutos(horario: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) return NaN;
  const [hora, minuto] = horario.split(':').map(Number);
  return hora * 60 + minuto;
}

function horario(minuto: number): string {
  return `${Math.floor(minuto / 60).toString().padStart(2, '0')}:${(minuto % 60).toString().padStart(2, '0')}`;
}

/**
 * Intercala aulas futuras e lacunas da agenda de hoje entre 08:00 e 21:30.
 * A aula em andamento permanece em "Aulas nesta sala hoje", mas ocupa seu
 * intervalo neste cálculo. Consulta incompleta ou inválida não comprova lacunas.
 * Pausas entre duas aulas de até INTERVALO_MAXIMO_MIN não viram "Sala vazia",
 * seguindo a mesma regra usada nas consultas de horários das turmas.
 */
export function proximosHorariosDaSala(aulas: AulaDoDia[], agora: Date, agendaDisponivel: boolean): ProximoHorario[] {
  const momento = minutos(horarioAcademico(agora).slice(0, 5));
  if (momento >= ENCERRAMENTO) return [];

  const convertidas = aulas.map(aula => ({ aula, inicio: minutos(aula.inicio), termino: minutos(aula.termino) }));
  const validas = convertidas.filter(aula => Number.isFinite(aula.inicio) && Number.isFinite(aula.termino) && aula.inicio < aula.termino);
  const noPeriodo = validas.filter(aula => aula.inicio < ENCERRAMENTO && aula.termino > ABERTURA)
    .sort((a, b) => a.inicio - b.inicio || a.termino - b.termino);
  const proximos: ProximoHorario[] = noPeriodo.filter(aula => aula.inicio > momento).map(({ aula, inicio, termino }) => ({
    tipo: 'aula', inicio: horario(Math.max(ABERTURA, inicio)), termino: horario(Math.min(ENCERRAMENTO, termino)),
    atividade: aula.disciplina, professor: aula.professor,
  }));
  if (!agendaDisponivel || validas.length !== aulas.length) return proximos;

  let cursor = Math.max(ABERTURA, momento);
  let terminoAnterior: number | undefined;
  const adicionarVazio = (termino: number) => proximos.push({
    tipo: 'vazio', inicio: horario(cursor), termino: horario(termino), atividade: 'Sala vazia',
  });
  for (const aula of noPeriodo) {
    const inicio = Math.max(ABERTURA, aula.inicio);
    const termino = Math.min(ENCERRAMENTO, aula.termino);
    // Usa a duração inteira da lacuna, mesmo quando o relógio está dentro dela.
    // Antes da primeira aula não há intervalo; o vazio final também é preservado.
    const intervalo = terminoAnterior !== undefined && inicio - terminoAnterior <= INTERVALO_MAXIMO_MIN;
    if (inicio > cursor && !intervalo) adicionarVazio(inicio);
    // Une a ocupação de aulas sobrepostas ou contíguas sem criar falsos vazios.
    cursor = Math.max(cursor, termino);
    terminoAnterior = Math.max(terminoAnterior ?? termino, termino);
  }
  if (cursor < ENCERRAMENTO) adicionarVazio(ENCERRAMENTO);
  return proximos.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
