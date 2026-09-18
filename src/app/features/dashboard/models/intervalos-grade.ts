import { AlocacaoResponse } from './grade-dia.model';

export interface IntervaloGrade { id: string; horaInicio: string; horaFim: string; }

/** Lacunas da grade pessoal, não recreios oficiais. O Java do quinto ano fornece apenas
 * horaInicio/horaFim/duracao em BlocoHorarioResponse. Substituir esta inferência se
 * o contrato futuro passar a fornecer intervalos explícitos.
 */
export function intervalosDaGrade(alocacoes: AlocacaoResponse[]): IntervaloGrade[] {
    const normalizar = (hora: string) => hora.length === 5 ? `${hora}:00` : hora;
    const aulas = alocacoes.map(a => ({ inicio: normalizar(a.blocoHorario.horaInicio), fim: normalizar(a.blocoHorario.horaFim) }))
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
    const intervalos: IntervaloGrade[] = [];
    let fimAnterior: string | undefined;
    for (const aula of aulas) {
        if (fimAnterior && fimAnterior < aula.inicio) {
            intervalos.push({ id: `intervalo-${fimAnterior}-${aula.inicio}`, horaInicio: fimAnterior, horaFim: aula.inicio });
        }
        if (!fimAnterior || aula.fim > fimAnterior) fimAnterior = aula.fim;
    }
    return intervalos;
}
