import { ler } from '../../../shared/utils/resposta-api';
import { nomeDisciplina, nomeSala, paraDiaSemana, paraHora } from '../../horarios/services/mapeadores-backend';
import { DIAS_SEMANA } from '../../horarios/models/item-horario';
import { predioDaSala } from '../../salas/services/localizacao-sala';
import { AulaProfessor, CursoProfessor, DiaProfessor, Professor } from '../models/professor';

export function idDaApi(valor: unknown): number {
    if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor <= 0) {
        throw new Error('Identificador inválido na resposta de professores.');
    }
    return valor;
}

function texto(registro: unknown, campo: string): string {
    const valor = ler(registro, campo);
    if (typeof valor !== 'string' || !valor.trim()) throw new Error('Dados incompletos na agenda do professor.');
    return valor.trim();
}

export function paraProfessor(registro: unknown): Professor {
    const id = idDaApi(ler(registro, 'id')), nome = texto(registro, 'nome');
    if (!['ATIVO', 'INATIVO'].includes(texto(registro, 'status'))) throw new Error('Status de professor inválido.');
    // Não equiparar status ou papel de autenticação a cargo/coordenação.
    return { id, nome, cargo: null };
}

/** O filtro apresenta o catálogo inteiro, inclusive cursos sem alocações vigentes. */
export function paraCursoProfessor(registro: unknown): CursoProfessor {
    const id = idDaApi(ler(registro, 'id')), nome = texto(registro, 'nome');
    if (!['ATIVO', 'INATIVO'].includes(texto(registro, 'status'))) throw new Error('Status de curso inválido.');
    return { id, nome };
}

function dataValida(valor: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(`${valor}T12:00:00Z`);
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function vigente(registro: unknown, hoje: string): boolean {
    const quadro = ler(registro, 'quadroHorario'), periodo = ler(quadro, 'periodoAtividadeQuadro');
    const status = ler(quadro, 'status'), statusPeriodo = ler(periodo, 'status');
    if (status === 'INATIVO' || statusPeriodo === 'INATIVO') return false;
    if (status !== 'ATIVO' || statusPeriodo !== 'ATIVO') throw new Error('Vigência da agenda não informada.');
    const inicio = texto(periodo, 'dataInicio'), fim = texto(periodo, 'dataFim');
    if (!dataValida(inicio) || !dataValida(fim) || inicio > fim) throw new Error('Vigência da agenda inválida.');
    return inicio <= hoje && hoje <= fim;
}

/** Ausência de docente só é permitida na consulta global, nunca na grade de um ID. */
export function paraAulaProfessor(registro: unknown, hoje: string, professorId?: number): AulaProfessor | null {
    const id = idDaApi(ler(registro, 'id')), professor = ler(registro, 'professor');
    if (professor == null && professorId === undefined) return null;
    const docenteId = idDaApi(ler(professor, 'id'));
    if (professorId !== undefined && docenteId !== professorId) throw new Error('A agenda retornou outro professor.');
    if (!vigente(registro, hoje)) return null;

    const turma = ler(registro, 'turma'), quadro = ler(registro, 'quadroHorario');
    const cursoTurma = ler(turma, 'curso'), cursoQuadro = ler(quadro, 'curso');
    const curso = cursoTurma ?? cursoQuadro, cursoId = idDaApi(ler(curso, 'id'));
    if (cursoTurma && cursoQuadro && ler(cursoQuadro, 'id') !== cursoId) {
        throw new Error('Curso incoerente na agenda do professor.');
    }
    if (ler(curso, 'status') === 'INATIVO') return null;
    if (ler(curso, 'status') !== 'ATIVO') throw new Error('Status de curso não informado.');

    const dia = paraDiaSemana(ler(registro, 'diaSemana')), diaBruto = ler(registro, 'diaSemana');
    const domingo = typeof diaBruto === 'string' && diaBruto.trim().toUpperCase() === 'DOMINGO';
    const diaSemana = domingo ? 'Domingo' : DIAS_SEMANA.find(d => d.valor === dia)?.nome;
    const bloco = ler(registro, 'blocoHorario');
    const inicio = paraHora(ler(bloco, 'horaInicio')), termino = paraHora(ler(bloco, 'horaFim'));
    const disciplina = nomeDisciplina(registro);
    if (!diaSemana || !inicio || !termino || inicio >= termino || !disciplina) {
        throw new Error('Horários incompletos na agenda do professor.');
    }
    idDaApi(ler(turma, 'id'));
    const sala = ler(registro, 'sala');
    let local = '';
    if (sala != null) {
        idDaApi(ler(sala, 'id'));
        texto(sala, 'codigo');
        const codigo = nomeSala(registro), tipo = ler(ler(sala, 'tipoSala'), 'nome');
        const predio = predioDaSala(codigo, typeof tipo === 'string' ? tipo : undefined);
        local = [codigo, predio].filter(Boolean).join(' – ');
    }
    const disciplinaId = idDaApi(ler(ler(registro, 'disciplina'), 'id'));
    const cores = ['verde', 'vermelho', 'azul', 'roxo'] as const;
    return { id, professorId: docenteId, diaSemana, inicio, termino, disciplina,
        turma: texto(turma, 'codigo'), local, curso: { id: cursoId, nome: texto(curso, 'nome') },
        cor: cores[(disciplinaId - 1) % cores.length] };
}

/** Usa a ocupação acumulada para não criar intervalos em aulas sobrepostas. */
export function agruparAulasProfessor(aulas: AulaProfessor[]): DiaProfessor[] {
    const dias = [...DIAS_SEMANA.map(d => d.nome), 'Domingo'];
    return dias.flatMap(diaSemana => {
        const ordenadas = aulas.filter(a => a.diaSemana === diaSemana).sort((a, b) =>
            a.inicio.localeCompare(b.inicio) || a.termino.localeCompare(b.termino) ||
            String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true }));
        if (!ordenadas.length) return [];
        const itens: DiaProfessor['itens'] = [];
        let fim = '';
        for (const aula of ordenadas) {
            if (fim && aula.inicio > fim) itens.push({ tipo: 'intervalo' });
            itens.push({ tipo: 'aula', aula });
            if (aula.termino > fim) fim = aula.termino;
        }
        return [{ diaSemana, itens }];
    });
}
