import { TestBed } from '@angular/core/testing';
import { ContextoGradeService } from './contexto-grade';
import { AulaGrade } from '../../horarios/models/grade-semanal';

describe('Contexto de retorno à Grade Semanal', () => {
    const aula: AulaGrade = { tipo: 'aula', diaSemana: 'seg', inicio: '13:20', termino: '14:10',
        materia: 'Matéria', professor: 'Docente', sala: 'Sala', cor: 'azul',
        referencias: { materia: { origem: 'local', id: 1 } } };
    const linhas = (valor = aula) => [{ inicio: '13:20', termino: '14:10', intervalo: false, celulas: [valor] }];
    it('preserva rolagem e bloco e aceita uma nova cor sem mudar a identidade da aula', () => {
        const service = TestBed.inject(ContextoGradeService);
        service.guardar('seg:13:20', aula, 150, 400);
        expect(service.consumir(linhas({ ...aula, cor: 'roxo' })))
            .toEqual(jasmine.objectContaining({ bloco: 'seg:13:20', tabela: 150, pagina: 400 }));
        expect(service.consumir(linhas())).toBeUndefined();
    });
    it('não restaura o bloco de uma entidade substituída com nome igual', () => {
        const service = TestBed.inject(ContextoGradeService);
        service.guardar('seg:13:20', aula, 0, 0);
        expect(service.consumir(linhas({ ...aula, referencias: { materia: { origem: 'java', id: 1 } } }))).toBeUndefined();
    });

    it('descarta o contexto após trocar de sessão', () => {
        const anterior = sessionStorage.getItem('gini_token'), localAnterior = localStorage.getItem('gini_token');
        try {
            localStorage.removeItem('gini_token');
            sessionStorage.setItem('gini_token', 'gini-contexto-teste-a');
            const service = TestBed.inject(ContextoGradeService);
            service.guardar('seg:13:20', aula, 0, 0);
            sessionStorage.setItem('gini_token', 'gini-contexto-teste-b');
            expect(service.consumir(linhas())).toBeUndefined();
        } finally {
            if (anterior === null) sessionStorage.removeItem('gini_token');
            else sessionStorage.setItem('gini_token', anterior);
            if (localAnterior !== null) localStorage.setItem('gini_token', localAnterior);
        }
    });
});
