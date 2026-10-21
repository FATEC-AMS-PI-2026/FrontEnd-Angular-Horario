import { alocacaoTeste } from '../../horarios/testing/grade-semanal.fixture';
import { AlocacaoResponse } from './grade-dia.model';
import { resumirDia } from './resumo-dia';

describe('Resumo de aulas do dia', () => {
    const bloco = (id: number, inicio: string, fim: string, alteracoes: Partial<AlocacaoResponse> = {}) =>
        alocacaoTeste({ id, origem: 'local', blocoHorario: {
            id, horaInicio: inicio, horaFim: fim, duracao: 50,
        }, ...alteracoes });

    it('conta dois blocos consecutivos como uma aula, sem modificar os dados ou sua ordem', () => {
        const aulas = [bloco(2, '14:10:00', '15:00:00'), bloco(1, '13:20', '14:10')];
        const antes = JSON.stringify(aulas);
        expect(resumirDia(aulas)).toEqual({ aulasAgrupadas: 1, professoresInformados: 1, aulasSemProfessor: 0 });
        expect(JSON.stringify(aulas)).toBe(antes);
    });

    it('conta o mesmo docente apenas uma vez mesmo em disciplinas distintas', () => {
        const aulas = [bloco(1, '13:20', '14:10'), bloco(2, '14:10', '15:00', {
            disciplina: { id: 2, nome: 'Outra disciplina', periodo: 1 },
        })];
        expect(resumirDia(aulas)).toEqual({ aulasAgrupadas: 2, professoresInformados: 1, aulasSemProfessor: 0 });
    });

    it('preserva os docentes conhecidos e conta aulas agrupadas sem professor separadamente', () => {
        const aulas = [bloco(1, '13:20', '14:10'), bloco(2, '14:10', '15:00', { professor: null }),
            bloco(3, '15:00', '15:50', { professor: null }), bloco(4, '16:00', '16:50', {
                professor: { id: 2, nome: 'Outra docente' },
            })];
        expect(resumirDia(aulas)).toEqual({ aulasAgrupadas: 3, professoresInformados: 2, aulasSemProfessor: 1 });
    });

    it('não considera ausências como pessoas e separa aulas após um intervalo', () => {
        const aulas = [bloco(1, '13:20', '14:10', { professor: null }),
            bloco(2, '14:20', '15:10', { professor: null })];
        expect(resumirDia(aulas)).toEqual({ aulasAgrupadas: 2, professoresInformados: 0, aulasSemProfessor: 2 });
    });

    it('não junta blocos quando muda a sala, o docente, a turma ou a versão do quadro', () => {
        for (const alteracoes of [
            { sala: { id: 2, codigo: 'LAB 02' } },
            { professor: { id: 2, nome: 'Outra docente' } },
            { turma: { id: 2, codigo: 'Outra turma', periodo: 1, ano: 2026 } },
            { quadroHorario: { id: 1, versao: 2 } },
        ]) {
            expect(resumirDia([bloco(1, '13:20', '14:10'), bloco(2, '14:10', '15:00', alteracoes)]).aulasAgrupadas)
                .withContext(JSON.stringify(alteracoes)).toBe(2);
        }
    });

    it('preserva identidades por fonte e não deduplica docentes homônimos pelo nome', () => {
        expect(resumirDia([bloco(1, '13:20', '14:10'), bloco(2, '14:10', '15:00', { origem: 'java' })]))
            .toEqual({ aulasAgrupadas: 2, professoresInformados: 2, aulasSemProfessor: 0 });
        const professor = { id: 2, nome: 'Prof. Renato' };
        expect(resumirDia([bloco(1, '13:20', '14:10'), bloco(2, '14:10', '15:00', { professor })]).professoresInformados)
            .toBe(2);
    });

    it('trata nome em branco como professor a definir e distingue o dia sem aulas', () => {
        expect(resumirDia([bloco(1, '13:20', '14:10', { professor: { id: 1, nome: ' ' } })]))
            .toEqual({ aulasAgrupadas: 1, professoresInformados: 0, aulasSemProfessor: 1 });
        expect(resumirDia([])).toEqual({ aulasAgrupadas: 0, professoresInformados: 0, aulasSemProfessor: 0 });
    });
});
