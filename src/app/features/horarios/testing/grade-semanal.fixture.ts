import { AlocacaoResponse } from '../../dashboard/models/grade-dia.model';

/** Dados exclusivos dos testes; nenhuma tela importa esta fixture. */
export function alocacaoTeste(alteracoes: Partial<AlocacaoResponse> = {}): AlocacaoResponse {
    return {
        id: 1, disciplina: { id: 1, nome: 'Banco de Dados', periodo: 1 },
        professor: { id: 1, nome: 'Prof. Renato' }, sala: { id: 1, codigo: 'Lab. 01' },
        diaSemana: 'SEGUNDA', blocoHorario: { id: 1, horaInicio: '13:20', horaFim: '14:10', duracao: 50 },
        turma: { id: 1, codigo: 'ADS1', periodo: 1, ano: 2026 }, quadroHorario: { id: 1, versao: 1 },
        ...alteracoes,
    };
}

export function gradeTeste(): AlocacaoResponse[] {
    const blocos = [
        ['13:20', '14:10'], ['14:10', '15:00'], ['15:10', '16:00'],
        ['16:00', '16:50'], ['17:00', '17:50'], ['17:50', '18:40'],
    ];
    const dias: AlocacaoResponse['diaSemana'][] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
    return dias.flatMap((diaSemana, dia) => blocos.map(([horaInicio, horaFim], bloco) => alocacaoTeste({
        id: dia * blocos.length + bloco + 1, diaSemana,
        blocoHorario: { id: bloco + 1, horaInicio, horaFim, duracao: 50 },
        disciplina: bloco < 2 ? { id: 2, nome: 'Projeto Integrador I', periodo: 1 }
            : { id: 1, nome: 'Banco de Dados', periodo: 1 },
        professor: bloco < 2 ? { id: 2, nome: 'Prof. Glauco Todesco' } : { id: 1, nome: 'Prof. Renato' },
    })));
}
