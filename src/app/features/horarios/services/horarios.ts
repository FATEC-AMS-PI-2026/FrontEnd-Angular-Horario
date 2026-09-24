import { Injectable, signal } from '@angular/core';
import { AulaHorario, DiaSemana, IntervaloHorario, ItemHorario } from '../models/item-horario';

/** Monta uma aula do mock sem repetir `tipo` e `diaSemana` em cada linha. */
function aula(
    diaSemana: DiaSemana,
    inicio: string,
    termino: string,
    materia: string,
    professor: string,
    sala: string,
): AulaHorario {
    return { tipo: 'aula', diaSemana, inicio, termino, materia, professor, sala };
}

function intervalo(diaSemana: DiaSemana, inicio: string, termino: string): IntervaloHorario {
    return { tipo: 'intervalo', diaSemana, inicio, termino };
}

/**
 * Intervalos fixos da tarde (mesmos horários da `GradeSemanal`), repetidos
 * em todos os dias que têm aula.
 */
function intervalosDoDia(diaSemana: DiaSemana): IntervaloHorario[] {
    return [intervalo(diaSemana, '15:00', '15:10'), intervalo(diaSemana, '16:50', '17:00')];
}

/**
 * Dados de exemplo enquanto o backend não está integrado. Segue as mesmas
 * matérias e horários da `GradeSemanal` e do `Dashboard` para as telas
 * ficarem coerentes entre si. Sábado fica sem aulas de propósito, para
 * exercitar o estado vazio da tabela.
 */
const HORARIOS_MOCK: ItemHorario[] = [
    aula('seg', '13:20', '14:10', 'Projeto Integrador I', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('seg', '14:10', '15:00', 'Projeto Integrador I', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('seg', '15:10', '16:00', 'Banco de Dados', 'Prof. Renato', 'Lab. 01'),
    aula('seg', '16:00', '16:50', 'Banco de Dados', 'Prof. Renato', 'Lab. 01'),
    aula('seg', '17:00', '17:50', 'Interação Humano-Computador', 'Prof. Renato', 'Sala 12'),
    aula('seg', '17:50', '18:40', 'Interação Humano-Computador', 'Prof. Renato', 'Sala 12'),
    ...intervalosDoDia('seg'),

    aula('ter', '13:20', '14:10', 'Banco de Dados', 'Prof. Renato', 'Lab. 01'),
    aula('ter', '14:10', '15:00', 'Banco de Dados', 'Prof. Renato', 'Lab. 01'),
    aula('ter', '15:10', '16:00', 'Interação Humano-Computador', 'Prof. Renato', 'Sala 12'),
    aula('ter', '16:00', '16:50', 'Interação Humano-Computador', 'Prof. Renato', 'Sala 12'),
    aula('ter', '17:00', '17:50', 'Desenvolvimento de Software', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('ter', '17:50', '18:40', 'Desenvolvimento de Software', 'Prof. Glauco Todesco', 'Lab. 03'),
    ...intervalosDoDia('ter'),

    aula('qua', '13:20', '14:10', 'Estrutura de Dados', 'Prof. Marcos', 'Lab. 02'),
    aula('qua', '14:10', '15:00', 'Estrutura de Dados', 'Prof. Marcos', 'Lab. 02'),
    aula('qua', '15:10', '16:00', 'Programação Mobile', 'Prof. Ana', 'Lab. 04'),
    aula('qua', '16:00', '16:50', 'Programação Mobile', 'Prof. Ana', 'Lab. 04'),
    aula('qua', '17:00', '17:50', 'Projeto Integrador I', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('qua', '17:50', '18:40', 'Projeto Integrador I', 'Prof. Glauco Todesco', 'Lab. 03'),
    ...intervalosDoDia('qua'),

    aula('qui', '13:20', '14:10', 'Programação Mobile', 'Prof. Ana', 'Lab. 04'),
    aula('qui', '14:10', '15:00', 'Programação Mobile', 'Prof. Ana', 'Lab. 04'),
    aula('qui', '15:10', '16:00', 'Desenvolvimento de Software', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('qui', '16:00', '16:50', 'Desenvolvimento de Software', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('qui', '17:00', '17:50', 'Banco de Dados', 'Prof. Renato', 'Lab. 01'),
    aula('qui', '17:50', '18:40', 'Banco de Dados', 'Prof. Renato', 'Lab. 01'),
    ...intervalosDoDia('qui'),

    aula('sex', '13:20', '14:10', 'Projeto Integrador I', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('sex', '14:10', '15:00', 'Projeto Integrador I', 'Prof. Glauco Todesco', 'Lab. 03'),
    aula('sex', '15:10', '16:00', 'Estrutura de Dados', 'Prof. Marcos', 'Lab. 02'),
    aula('sex', '16:00', '16:50', 'Estrutura de Dados', 'Prof. Marcos', 'Lab. 02'),
    aula('sex', '17:00', '17:50', 'Interação Humano-Computador', 'Prof. Renato', 'Sala 12'),
    aula('sex', '17:50', '18:40', 'Interação Humano-Computador', 'Prof. Renato', 'Sala 12'),
    ...intervalosDoDia('sex'),
];

@Injectable({ providedIn: 'root' })
export class HorariosService {
    private readonly itensSignal = signal<ItemHorario[]>(HORARIOS_MOCK);

    /** Grade da semana inteira (aulas e intervalos), em qualquer ordem. */
    readonly itens = this.itensSignal.asReadonly();

    // TODO(integração backend): quando a API de horários estiver disponível,
    // injetar HttpClient e preencher `itensSignal` a partir dela (mesmo
    // padrão de `ProfessoresService`). O componente só depende do signal
    // `itens`, então não precisa mudar.
}
