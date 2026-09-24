// Projeções dos campos de AlocacaoResponse e dos DTOs associados do Java/Spring.
// O vínculo da grade com o aluno ainda precisa ser fornecido pelo backend.
export type DiaSemana = 'DOMINGO' | 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO';

export interface AlocacaoResponse {
    id: number;
    disciplina: { id: number; nome: string; periodo: number };
    professor: { id: number; nome: string } | null;
    sala: { id: number; codigo: string } | null;
    diaSemana: DiaSemana;
    blocoHorario: { id: number; horaInicio: string; horaFim: string; duracao: number };
    turma: { id: number; codigo: string; periodo: number; ano: number };
    quadroHorario: { id: number; versao: number };
}

export const DIAS_SEMANA: readonly DiaSemana[] = [
    'DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO',
];

export function dataAcademica(agora: Date): string {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(agora);
    const parte = (tipo: string) => partes.find(item => item.type === tipo)!.value;
    return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export function diaSemana(data: string): DiaSemana {
    return DIAS_SEMANA[new Date(`${data}T12:00:00Z`).getUTCDay()];
}

export function horarioAcademico(agora: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23',
    }).format(agora);
}
