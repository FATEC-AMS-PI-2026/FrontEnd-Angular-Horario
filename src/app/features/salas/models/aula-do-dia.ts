/**
 * Uma aula (ou atividade) agendada na sala para o dia atual, exibida pelo
 * `AulasDoDiaCard` — cobre a issue "WEB: Lista de aulas do dia na sala"
 * (#12).
 *
 * Diferente de `ProximoHorario` (issue #44, que lista só os horários
 * futuros da sala), `AulaDoDia` cobre o dia inteiro — inclusive aulas já
 * encerradas e a que está em andamento agora — e por isso também tem
 * `turma`, pedido pelo critério de aceite da #12.
 */
export interface AulaDoDia {
  /** Horário de início, no formato `HH:mm`. */
  inicio: string;
  /** Horário de término, no formato `HH:mm`. */
  termino: string;
  /** Nome da disciplina. */
  disciplina: string;
  /** Professor responsável, quando houver. */
  professor?: string;
  /** Turma que ocupa a sala nesse horário. */
  turma: string;
}
