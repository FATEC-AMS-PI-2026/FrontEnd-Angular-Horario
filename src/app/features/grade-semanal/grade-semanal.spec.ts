import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { GradeSemanal, PROFESSOR_A_DEFINIR } from './grade-semanal';
import { CARREGAR_GRADE_SEMANAL } from '../horarios/services/grade-semanal-source';
import { alocacaoTeste, gradeTeste } from '../horarios/testing/grade-semanal.fixture';
import { AlocacaoResponse } from '../dashboard/models/grade-dia.model';
import { AulaGrade } from '../horarios/models/grade-semanal';
import { HorariosService } from '../horarios/services/horarios';

function criar(alocacoes = gradeTeste()): ComponentFixture<GradeSemanal> {
    TestBed.configureTestingModule({ imports: [GradeSemanal], providers: [
        { provide: CARREGAR_GRADE_SEMANAL, useValue: () => of(alocacoes) },
    ] });
    const fixture = TestBed.createComponent(GradeSemanal);
    fixture.detectChanges();
    return fixture;
}

function elementos(fixture: ComponentFixture<GradeSemanal>, seletor: string): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(seletor) as NodeListOf<HTMLElement>);
}

function texto(fixture: ComponentFixture<GradeSemanal>, seletor: string): string[] {
    return elementos(fixture, seletor).map(el => el.textContent?.trim() ?? '');
}

describe('GradeSemanal', () => {
    it('renderiza a matriz do Service com células inclusive nas lacunas', () => {
        const fixture = criar();
        expect(texto(fixture, '.cabecalho > div')).toEqual(['Horário', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
        expect(elementos(fixture, '.linha:not(.linha-intervalo)').length).toBe(6);
        expect(elementos(fixture, '.linha-intervalo').length).toBe(2);
        expect(elementos(fixture, '.etiqueta-materia').length).toBe(30);
        expect(elementos(fixture, '.linha-intervalo .celula').length).toBe(10);
    });

    it('posiciona cada disciplina na intersecção correta e mantém as outras células vazias', () => {
        const fixture = criar([alocacaoTeste({ diaSemana: 'QUARTA' })]);
        const celulas = elementos(fixture, '.linha .celula');
        expect(celulas.length).toBe(5);
        expect(celulas.map(celula => celula.querySelector('.etiqueta-materia__nome')?.textContent?.trim() ?? ''))
            .toEqual(['', '', 'Banco de Dados', '', '']);
        expect(texto(fixture, '.coluna-horario span')).toEqual(['13:20', '14:10']);
    });

    it('exibe professor da alocação ou "Professor a definir" (#114)', () => {
        const fixture = criar([alocacaoTeste(), alocacaoTeste({ id: 2, diaSemana: 'TERCA', professor: null })]);
        expect(texto(fixture, '.etiqueta-materia__professor')).toEqual(['Prof. Renato', PROFESSOR_A_DEFINIR]);
        expect(elementos(fixture, '.etiqueta-materia__professor--a-definir').length).toBe(1);
    });

    it('aplica exatamente a cor retornada pelo Service, sem sortear na página', () => {
        const aula: AulaGrade = {
            tipo: 'aula', diaSemana: 'qui', inicio: '09:00', termino: '10:00',
            materia: 'Disciplina do Service', professor: '', sala: '', cor: 'magenta',
        };
        TestBed.configureTestingModule({ imports: [GradeSemanal], providers: [
            { provide: HorariosService, useValue: {
                carregar: () => {}, carregando: () => false, carregado: () => true, erro: () => null,
                dias: () => [{ valor: 'qui', nome: 'Quinta' }],
                linhas: () => [{ inicio: '09:00', termino: '10:00', intervalo: false, celulas: [aula] }],
            } },
        ] });
        const fixture = TestBed.createComponent(GradeSemanal);
        fixture.detectChanges();
        expect(elementos(fixture, '.etiqueta-materia')[0].classList).toContain('cor-magenta');
        expect(texto(fixture, '.etiqueta-materia__nome')).toEqual(['Disciplina do Service']);
    });

    it('inclui sábado somente quando há alocação nesse dia', () => {
        const fixture = criar([alocacaoTeste({ diaSemana: 'SABADO' })]);
        expect(texto(fixture, '.cabecalho > div').at(-1)).toBe('Sábado');
        expect(elementos(fixture, '.linha .celula').length).toBe(6);
    });

    it('mostra vazio sem construir uma tabela fictícia', () => {
        const fixture = criar([]);
        expect(fixture.nativeElement.textContent).toContain('Você não tem aulas na sua grade semanal.');
        expect(elementos(fixture, '.tabela').length).toBe(0);
    });

    it('distingue carregamento e erro, e recarrega pelo botão de nova tentativa', () => {
        const primeira = new Subject<AlocacaoResponse[]>();
        const fonte = jasmine.createSpy('fonte').and.returnValue(primeira);
        TestBed.configureTestingModule({ imports: [GradeSemanal], providers: [
            { provide: CARREGAR_GRADE_SEMANAL, useValue: fonte },
        ] });
        const fixture = TestBed.createComponent(GradeSemanal);
        fixture.detectChanges();
        expect(texto(fixture, '[role=status]')).toEqual(['Carregando sua grade semanal...']);
        expect(fixture.nativeElement.querySelector('[aria-busy=true]')).not.toBeNull();
        primeira.error(new Error('Falha'));
        fixture.detectChanges();
        expect(elementos(fixture, '[role=alert]').length).toBe(1);
        expect(elementos(fixture, '.tabela').length).toBe(0);
        fonte.and.returnValue(of([alocacaoTeste()]));
        elementos(fixture, '.botao-tentar')[0].click();
        fixture.detectChanges();
        expect(texto(fixture, '.etiqueta-materia__nome')).toEqual(['Banco de Dados']);
        expect(elementos(fixture, '[role=alert]').length).toBe(0);
    });
});
