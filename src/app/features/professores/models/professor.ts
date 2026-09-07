/**
 * Cargo do professor dentro do curso. Usado tanto para exibir a etiqueta
 * "COORDENADOR" no card quanto para alimentar o filtro "Todos os cargos".
 */
export type CargoProfessor = 'Professor' | 'Coordenador do Curso';

/**
 * Uma aula do professor na semana, agrupada por dia na tela de Professores.
 * Modelada de forma parecida com `AulaDoDia` (feature de salas), mas do
 * ponto de vista do professor: em vez da turma, guardamos o local da aula.
 */
export interface AulaProfessor {
    /** Dia da semana por extenso (ex.: "Terça-feira"), usado para agrupar. */
    diaSemana: string;
    /** Horário de início, no formato `HH:mm`. */
    inicio: string;
    /** Horário de término, no formato `HH:mm`. */
    termino: string;
    /** Nome da disciplina. */
    disciplina: string;
    /** Local da aula (sala/prédio/andar), ex.: "Lab. 03 – Prédio 4 | Andar 3". */
    local: string;
    /**
     * Cor de destaque do cartão da aula. Sem valor informado, o componente
     * aplica "verde" como padrão. Permite diferenciar visualmente disciplinas
     * ou turmas distintas, como na referência (aulas de terça em verde e de
     * sexta em vermelho).
     */
    cor?: 'verde' | 'vermelho' | 'azul' | 'roxo';
}

/**
 * Um professor cadastrado em um curso, com suas aulas da semana. Os dados
 * hoje vêm de `PROFESSORES_MOCK` (ver `ProfessoresService`) enquanto não
 * existe endpoint de professores no BackEnd.
 */
export interface Professor {
    id: number;
    nome: string;
    cargo: CargoProfessor;
    /** Curso ao qual o professor está vinculado (ex.: "ADS", "PG"). */
    curso: string;
    aulas: AulaProfessor[];
}
