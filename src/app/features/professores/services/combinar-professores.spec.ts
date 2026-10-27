import { AulaProfessor, Professor } from '../models/professor';
import { unirAulasProfessores, unirCursosProfessores, unirProfessores } from './combinar-professores';
import { paraAulaProfessor } from './mapeadores-professores';
import { alocacaoApi } from '../testing/professores-api.fixture';

describe('Professores: combinação por fonte', () => {
    it('não equipara IDs nem confunde docentes que compartilham parte do nome', () => {
        const java: Professor[] = [{ id: 1, nome: 'Carlos', cargo: null },
            { id: 2, nome: 'Lilian Oliveira', cargo: null }];
        const locais: Professor[] = [{ id: 'local-1', idLocal: 1, nome: 'Glauco Todesco', cargo: null },
            { id: 'local-2', idLocal: 2, nome: 'Lilian Simão Oliveira', cargo: null },
            { id: 'local-3', idLocal: 3, nome: '  LÍLIAN   Oliveira ', cargo: null }];
        const unidos = unirProfessores(java, locais);
        expect(unidos.length).toBe(4);
        expect(unidos.find(p => p.id === 1)?.idLocal).toBeUndefined();
        expect(unidos.find(p => p.id === 2)?.idLocal).toBe(3);
        expect(unidos.some(p => p.id === 'local-1')).toBeTrue();
        expect(unidos.some(p => p.id === 'local-2')).toBeTrue();
    });

    it('mantém homônimos quando a correspondência não é única', () => {
        const java: Professor[] = [{ id: 1, nome: 'Ana Silva', cargo: null }, { id: 2, nome: 'Ana Silva', cargo: null }];
        const locais: Professor[] = [{ id: 'local-1', idLocal: 1, nome: 'Ana Silva', cargo: null }];
        const unidos = unirProfessores(java, locais);
        expect(unidos.length).toBe(3);
        expect(unidos.filter(p => typeof p.id === 'number').every(p => p.idLocal === undefined)).toBeTrue();
    });

    it('combina cursos só pelo nome completo e separa IDs coincidentes ou cursos AMS', () => {
        const uniao = unirCursosProfessores([{ id: 1, nome: 'Análise de Sistemas' }], [
            { id: 'local-1', nome: 'Gestão' }, { id: 'local-2', nome: 'Analise de Sistemas' },
            { id: 'local-3', nome: 'Análise de Sistemas — AMS' },
        ]);
        expect(uniao.cursos.length).toBe(3);
        expect(uniao.ids.get('local-1')).toBe('local-1');
        expect(uniao.ids.get('local-2')).toBe(1);
        expect(uniao.ids.get('local-3')).toBe('local-3');
    });

    it('prioriza aulas Java sobrepostas e preserva complemento local contíguo ou de outro dia', () => {
        const a = paraAulaProfessor(alocacaoApi(), '2026-10-13')!;
        const locais: AulaProfessor[] = [
            { ...a, id: 'local-1', inicio: '13:30', termino: '14:00' },
            { ...a, id: 'local-2', inicio: '14:10', termino: '15:00' },
            { ...a, id: 'local-3', diaSemana: 'Quarta-feira' },
        ];
        expect(unirAulasProfessores([a], locais).map(a => a.id)).toEqual([1, 'local-2', 'local-3']);
    });
});
