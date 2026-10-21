import { AlocacaoResponse } from './grade-dia.model';

export interface ResumoDia {
    aulasAgrupadas: number;
    professoresInformados: number;
    aulasSemProfessor: number;
}

/** Blocos contíguos só formam uma aula quando mantêm disciplina, docente, sala,
 * turma, quadro e origem. Intervalos e mudanças de contexto iniciam outra aula.
 * O resumo não modifica os blocos retornados pelo Service ou exibidos na lista. */
export function resumirDia(alocacoes: readonly AlocacaoResponse[]): ResumoDia {
    const horario = (valor: string) => valor.length === 5 ? `${valor}:00` : valor;
    const ordenadas = [...alocacoes].sort((a, b) =>
        horario(a.blocoHorario.horaInicio).localeCompare(horario(b.blocoHorario.horaInicio)));
    const ultimosTerminos = new Map<string, string>();
    const professores = new Set<string>();
    let aulasAgrupadas = 0;
    let aulasSemProfessor = 0;

    for (const aula of ordenadas) {
        const professorInformado = !!aula.professor?.nome.trim();
        const origem = aula.origem ?? null;
        if (professorInformado) professores.add(JSON.stringify([origem, aula.professor!.id]));
        const chave = JSON.stringify([
            origem, aula.diaSemana, aula.disciplina.id, aula.professor?.id ?? null,
            professorInformado, aula.sala?.id ?? null, aula.turma.id,
            aula.quadroHorario.id, aula.quadroHorario.versao,
            aula.reposicao?.data ?? null, aula.reposicao?.diaSemana ?? null, aula.reposicao?.turno ?? null,
        ]);
        const inicio = horario(aula.blocoHorario.horaInicio);
        if (ultimosTerminos.get(chave) !== inicio) {
            aulasAgrupadas++;
            if (!professorInformado) aulasSemProfessor++;
        }
        ultimosTerminos.set(chave, horario(aula.blocoHorario.horaFim));
    }

    return { aulasAgrupadas, professoresInformados: professores.size, aulasSemProfessor };
}
