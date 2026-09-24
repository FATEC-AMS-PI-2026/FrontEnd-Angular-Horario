/**
 * Dia da semana exibido nos chips da tela de Horários. Domingo não aparece
 * porque não há aulas nesse dia (critério de aceite da issue #103: Seg a Sáb).
 */
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';

/** Uma aula na grade do aluno, exibida como uma linha da tabela de Horários. */
export interface AulaHorario {
    tipo: 'aula';
    diaSemana: DiaSemana;
    /** Horário de início, no formato `HH:mm`. */
    inicio: string;
    /** Horário de término, no formato `HH:mm`. */
    termino: string;
    /** Nome da disciplina. */
    materia: string;
    /** Professor responsável pela aula. */
    professor: string;
    /** Sala/laboratório onde a aula acontece, ex.: "Lab. 03". */
    sala: string;
}

/**
 * Período de intervalo entre aulas. Na tabela vira uma linha separadora
 * só com o horário e o título "Intervalo" (critério de aceite da #103).
 */
export interface IntervaloHorario {
    tipo: 'intervalo';
    diaSemana: DiaSemana;
    inicio: string;
    termino: string;
}

/** Item da grade de um dia: uma aula ou um intervalo. */
export type ItemHorario = AulaHorario | IntervaloHorario;
