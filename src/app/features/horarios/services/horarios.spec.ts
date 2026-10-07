import { TestBed } from '@angular/core/testing';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { A_DEFINIR, HorariosService } from './horarios';
import { CARREGAR_GRADE_SEMANAL } from './grade-semanal-source';
import { AulaHorario, DiaSemana } from '../models/item-horario';
import { AlocacaoResponse } from '../../dashboard/models/grade-dia.model';
import { alocacaoTeste, gradeTeste } from '../testing/grade-semanal.fixture';
import { PALETA_MATERIAS } from '../../../shared/utils/cores-materia';

describe('HorariosService: grade pessoal', () => {
    let service: HorariosService;
    let fonte: jasmine.Spy;

    beforeEach(() => {
        fonte = jasmine.createSpy('carregarGrade').and.returnValue(of(gradeTeste()));
        TestBed.configureTestingModule({ providers: [{ provide: CARREGAR_GRADE_SEMANAL, useValue: fonte }] });
        service = TestBed.inject(HorariosService);
    });

    function aulasDe(dia: DiaSemana): AulaHorario[] {
        return service.itens().filter((item): item is AulaHorario => item.tipo === 'aula' && item.diaSemana === dia);
    }

    it('começa sem grade fictícia e aguarda a fonte, bloqueando pedidos repetidos', () => {
        const resposta = new Subject<AlocacaoResponse[]>();
        fonte.and.returnValue(resposta);
        expect(service.itens()).toEqual([]);
        service.carregar();
        service.carregar();
        expect(service.carregando()).toBeTrue();
        expect(service.carregado()).toBeFalse();
        expect(fonte).toHaveBeenCalledTimes(1);
        resposta.next([alocacaoTeste()]);
        expect(service.carregado()).toBeTrue();
        expect(service.carregando()).toBeFalse();
        expect(aulasDe('seg')[0].materia).toBe('Banco de Dados');
    });

    it('mapeia nomes, professor e sala da fonte e ordena matérias/blocos', () => {
        service.carregar();
        expect(service.materias()).toEqual(['Banco de Dados', 'Projeto Integrador I']);
        expect(service.blocos().map(bloco => bloco.inicio)).toEqual([
            '13:20', '14:10', '15:10', '16:00', '17:00', '17:50',
        ]);
        expect(aulasDe('seg')[0]).toEqual(jasmine.objectContaining({
            materia: 'Projeto Integrador I', professor: 'Prof. Glauco Todesco', sala: 'Lab. 01',
        }));
    });

    it('calcula lacunas fora do turno padrão e não cria intervalo antes/depois das aulas', () => {
        fonte.and.returnValue(of([
            alocacaoTeste({ blocoHorario: { id: 1, horaInicio: '08:00:00', horaFim: '09:30:00', duracao: 90 } }),
            alocacaoTeste({ id: 2, blocoHorario: { id: 2, horaInicio: '10:00', horaFim: '11:00', duracao: 60 } }),
        ]));
        service.carregar();
        expect(service.itens().filter(item => item.tipo === 'intervalo')).toEqual([
            { tipo: 'intervalo', diaSemana: 'seg', inicio: '09:30', termino: '10:00' },
        ]);
        expect(service.linhas().map(linha => [linha.inicio, linha.termino])).toEqual([
            ['08:00', '09:30'], ['09:30', '10:00'], ['10:00', '11:00'],
        ]);
    });

    it('posiciona aulas com mesmo início e términos diferentes sem sobrescrever blocos', () => {
        fonte.and.returnValue(of([
            alocacaoTeste({ blocoHorario: { id: 1, horaInicio: '08:00', horaFim: '10:00', duracao: 120 } }),
            alocacaoTeste({ id: 2, diaSemana: 'TERCA',
                disciplina: { id: 2, nome: 'Outra matéria', periodo: 2 },
                blocoHorario: { id: 2, horaInicio: '08:00', horaFim: '09:00', duracao: 60 } }),
            alocacaoTeste({ id: 3, diaSemana: 'TERCA',
                blocoHorario: { id: 3, horaInicio: '09:30', horaFim: '10:00', duracao: 30 } }),
        ]));
        service.carregar();
        const linhas = service.linhas();
        expect(service.blocos().length).toBe(3);
        expect(linhas.map(linha => [linha.inicio, linha.termino])).toEqual([
            ['08:00', '09:00'], ['09:00', '09:30'], ['09:30', '10:00'],
        ]);
        expect(linhas.every(linha => linha.celulas[0]?.materia === 'Banco de Dados')).toBeTrue();
        expect(linhas[1].celulas[1]).toBeNull();
        expect(linhas.every(linha => linha.celulas.slice(2).every(celula => celula === null))).toBeTrue();
    });

    it('reconsulta a fonte para refletir alterações de disciplinas e não mantém aulas antigas', () => {
        service.carregar();
        fonte.and.returnValue(of([alocacaoTeste({ diaSemana: 'SEXTA', professor: null, sala: null })]));
        service.carregar();
        expect(aulasDe('seg')).toEqual([]);
        expect(aulasDe('sex')).toEqual([jasmine.objectContaining({ professor: '', sala: '' })]);
        expect(service.materias()).toEqual(['Banco de Dados']);
    });

    it('distingue erro de grade vazia e permite nova tentativa sem fallback mockado', () => {
        fonte.and.returnValue(throwError(() => new Error('Falha')));
        service.carregar();
        expect(service.erro()).toContain('Não foi possível carregar');
        expect(service.carregado()).toBeFalse();
        expect(service.linhas()).toEqual([]);
        fonte.and.returnValue(of([]));
        service.carregar();
        expect(service.carregado()).toBeTrue();
        expect(service.erro()).toBeNull();
        expect(service.linhas()).toEqual([]);
    });

    it('informa indisponibilidade sem um adaptador de grade pessoal', () => {
        TestBed.resetTestingModule();
        service = TestBed.inject(HorariosService);
        service.carregar();
        expect(service.erro()).toContain('ainda não está disponível');
        expect(service.itens()).toEqual([]);
    });

    it('encerra o loading com erro quando a fonte completa sem resposta', () => {
        fonte.and.returnValue(EMPTY);
        service.carregar();
        expect(service.carregando()).toBeFalse();
        expect(service.carregado()).toBeFalse();
        expect(service.erro()).not.toBeNull();
    });

    it('recusa respostas inválidas, duplicadas ou sobrepostas em vez de esconder aulas', () => {
        const respostas = [
            [alocacaoTeste({ blocoHorario: { id: 1, horaInicio: '25:00', horaFim: '26:00', duracao: 60 } })],
            [alocacaoTeste(), alocacaoTeste()],
            [alocacaoTeste(), alocacaoTeste({ id: 2 })],
            [alocacaoTeste({ diaSemana: 'DOMINGO' })],
        ];
        for (const resposta of respostas) {
            fonte.and.returnValue(of(resposta));
            service.carregar();
            expect(service.erro()).withContext(JSON.stringify(resposta)).not.toBeNull();
            expect(service.linhas()).toEqual([]);
        }
    });

    it('ignora resposta atrasada de outra conta', () => {
        const tokenAnterior = sessionStorage.getItem('gini_token');
        const localAnterior = localStorage.getItem('gini_token');
        try {
            localStorage.removeItem('gini_token');
            sessionStorage.setItem('gini_token', 'gini-local:conta-a');
            const resposta = new Subject<AlocacaoResponse[]>();
            fonte.and.returnValue(resposta);
            service.carregar();
            sessionStorage.setItem('gini_token', 'gini-local:conta-b');
            resposta.next([alocacaoTeste()]);
            expect(service.itens()).toEqual([]);
            expect(service.carregado()).toBeFalse();
            fonte.and.returnValue(of([alocacaoTeste({ diaSemana: 'TERCA' })]));
            service.carregar();
            expect(aulasDe('ter').length).toBe(1);
        } finally {
            if (tokenAnterior) sessionStorage.setItem('gini_token', tokenAnterior);
            else sessionStorage.removeItem('gini_token');
            if (localAnterior) localStorage.setItem('gini_token', localAnterior);
        }
    });

    it('fornece as cores da matriz: mesma matéria mantém a cor, com sorteio por carregamento (#115)', () => {
        const aleatorio = spyOn(Math, 'random').and.returnValue(0);
        service.carregar();
        const cor = service.linhas()[0].celulas[0]!.cor;
        expect(PALETA_MATERIAS).toContain(cor);
        expect(service.linhas()[1].celulas[0]!.cor).toBe(cor);
        service.adicionarAula({ diaSemana: 'sab', materia: 'Projeto Integrador I',
            bloco: { inicio: '13:20', termino: '14:10' } });
        expect(service.linhas()[0].celulas[0]!.cor).toBe(cor);
        aleatorio.and.returnValue(0.99);
        service.carregar();
        expect(service.linhas()[0].celulas[0]!.cor).not.toBe(cor);
    });

    it('preserva inclusões da #104 ao trocar de tela, mas descarta ao mudar as escolhas salvas', () => {
        service.carregar();
        service.adicionarAula({ diaSemana: 'sab', materia: 'Banco de Dados',
            bloco: { inicio: '13:20', termino: '14:10' } });
        service.carregar();
        expect(aulasDe('sab').length).toBe(1);
        fonte.and.returnValue(of([alocacaoTeste()]));
        service.carregar();
        expect(aulasDe('sab')).toEqual([]);
        expect(service.itens().length).toBe(1);
    });

    it('mantém o modal da #104 e rejeita qualquer sobreposição, inclusive início diferente', () => {
        service.carregar();
        expect(service.adicionarAula({ diaSemana: 'sab', materia: 'Banco de Dados',
            bloco: { inicio: '13:20', termino: '14:10' } })).toEqual({ ok: true });
        expect(aulasDe('sab')[0]).toEqual(jasmine.objectContaining({
            materia: 'Banco de Dados', professor: 'Prof. Renato', sala: 'Lab. 01',
        }));
        const antes = service.itens().length;
        expect(service.adicionarAula({ diaSemana: 'sab', materia: 'Banco de Dados',
            bloco: { inicio: '13:50', termino: '14:40' } }).ok).toBeFalse();
        expect(service.itens().length).toBe(antes);
        service.adicionarAula({ diaSemana: 'sab', materia: 'Matéria Nova',
            bloco: { inicio: '19:00', termino: '20:00' } });
        expect(aulasDe('sab')[1]).toEqual(jasmine.objectContaining({ professor: A_DEFINIR, sala: A_DEFINIR }));
    });
});
