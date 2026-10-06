/**
 * Dia da semana exibido nos chips da tela de Horários. Domingo não aparece
 * porque não há aulas nesse dia (critério de aceite da issue #103: Seg a Sáb).
 */
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';

/**
 * Chips de dia na ordem da semana. Usado pela tela de Horários e pelo modal
 * "Adicionar Matéria" (#104), para os dois terem os mesmos rótulos.
 */
export const DIAS_SEMANA: { valor: DiaSemana; rotulo: string; nome: string }[] = [
    { valor: 'seg', rotulo: 'Seg', nome: 'Segunda-feira' },
    { valor: 'ter', rotulo: 'Ter', nome: 'Terça-feira' },
    { valor: 'qua', rotulo: 'Qua', nome: 'Quarta-feira' },
    { valor: 'qui', rotulo: 'Qui', nome: 'Quinta-feira' },
    { valor: 'sex', rotulo: 'Sex', nome: 'Sexta-feira' },
    { valor: 'sab', rotulo: 'Sáb', nome: 'Sábado' },
];

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

/** Bloco de horário de aula (ex.: 13:20 – 14:10), oferecido como chip no modal da #104. */
export interface BlocoHorario {
    inicio: string;
    termino: string;
}

/** Dados escolhidos pelo aluno no modal "Adicionar Matéria" (#104). */
export interface NovaAula {
    diaSemana: DiaSemana;
    materia: string;
    bloco: BlocoHorario;
}

/** Resultado de `HorariosService.adicionarAula`: sucesso ou a mensagem de erro para o modal. */
export type ResultadoAdicao = { ok: true } | { ok: false; erro: string };
