/**
 * Uma aula futura ou intervalo sem aula na sala, exibido no componente da
 * issue "WEB: Lista de próximos horários da sala" (#44).
 */
export interface ProximoHorario {
  /** Distingue as aulas dos intervalos sem aula cadastrada. */
  tipo?: 'aula' | 'vazio';
  /** Horário de início, no formato `HH:mm`. */
  inicio: string;
  /** Horário de término, no formato `HH:mm`. */
  termino: string;
  /** Nome da aula ou "Sala vazia" para um intervalo sem aula. */
  atividade: string;
  /** Professor responsável pela atividade, quando houver. */
  professor?: string;
}
