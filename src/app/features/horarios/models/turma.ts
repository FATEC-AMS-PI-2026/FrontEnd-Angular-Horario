/**
 * Turma ativa de um curso, como vem do backend Java (`GET /turmas?curso=`), #150.
 * O backend não tem turno na turma e a mantém única por curso + ano + período.
 */
export interface Turma {
    id: number;
    /** Código livre definido pela coordenação, ex.: "1/2026" ou "2/2026-ADS". */
    codigo: string;
    /** Ano ou semestre do curso em que a turma está (1, 2, ...). */
    periodo: number;
    /** Ano letivo, ex.: 2026. */
    ano: number;
    numeroAlunos: number | null;
    cursoId: number | null;
    cursoNome: string | null;
}
