import { TestBed } from '@angular/core/testing';

import { A_DEFINIR, HorariosService } from './horarios';
import { AulaHorario, DiaSemana } from '../models/item-horario';

describe('HorariosService', () => {
    let service: HorariosService;

    beforeEach(() => {
        service = TestBed.inject(HorariosService);
    });

    function aulasDe(dia: DiaSemana): AulaHorario[] {
        return service.itens().filter((item): item is AulaHorario => item.tipo === 'aula' && item.diaSemana === dia);
    }

    it('lista as matérias sem repetição e em ordem alfabética', () => {
        const materias = service.materias();
        expect(new Set(materias).size).toBe(materias.length);
        expect(materias).toEqual([...materias].sort((a, b) => a.localeCompare(b, 'pt-BR')));
        expect(materias).toContain('Banco de Dados');
    });

    it('lista os blocos de aula em ordem cronológica, sem os intervalos', () => {
        expect(service.blocos().map((bloco) => bloco.inicio)).toEqual([
            '13:20', '14:10', '15:10', '16:00', '17:00', '17:50',
        ]);
    });

    it('adiciona a aula reaproveitando professor e sala de outra aula da mesma matéria', () => {
        const resultado = service.adicionarAula({
            diaSemana: 'sab',
            materia: 'Banco de Dados',
            bloco: { inicio: '13:20', termino: '14:10' },
        });

        expect(resultado).toEqual({ ok: true });
        expect(aulasDe('sab')).toEqual([
            jasmine.objectContaining({ materia: 'Banco de Dados', professor: 'Prof. Renato', sala: 'Lab. 01', termino: '14:10' }),
        ]);
    });

    it('usa "A definir" quando não há referência de professor e sala', () => {
        service.adicionarAula({ diaSemana: 'sab', materia: 'Matéria Nova', bloco: { inicio: '13:20', termino: '14:10' } });
        expect(aulasDe('sab')[0]).toEqual(jasmine.objectContaining({ professor: A_DEFINIR, sala: A_DEFINIR }));
    });

    it('recusa aula em dia e horário já ocupados', () => {
        const antes = service.itens().length;
        const resultado = service.adicionarAula({
            diaSemana: 'seg',
            materia: 'Banco de Dados',
            bloco: { inicio: '13:20', termino: '14:10' },
        });

        expect(resultado).toEqual({ ok: false, erro: 'Já existe uma aula nesse dia e horário.' });
        expect(service.itens().length).toBe(antes);
    });
});
