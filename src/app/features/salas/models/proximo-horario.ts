/**
 * Um horário futuro de utilização de uma sala, exibido no componente da
 * issue "WEB: Lista de próximos horários da sala" (#44).
 */
export interface ProximoHorario {
  /** Horário de início, no formato `HH:mm`. */
  inicio: string;
  /** Horário de término, no formato `HH:mm`. */
  termino: string;
  /** Atividade ou aula que ocupará a sala nesse horário. */
  atividade: string;
  /** Professor responsável pela atividade, quando houver. */
  professor?: string;
}
