import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeSemanal, PROFESSOR_A_DEFINIR } from './grade-semanal';
import { HorariosService } from '../horarios/services/horarios';
import { ItemHorario } from '../horarios/models/item-horario';
import { PALETA_MATERIAS } from '../../shared/utils/cores-materia';

function criar(itens?: ItemHorario[]): ComponentFixture<GradeSemanal> {
    TestBed.configureTestingModule({
        imports: [GradeSemanal],
        providers: itens ? [{ provide: HorariosService, useValue: { itens: signal(itens).asReadonly() } }] : [],
    });
    const fixture = TestBed.createComponent(GradeSemanal);
    fixture.detectChanges();
    return fixture;
}

function elementos(fixture: ComponentFixture<GradeSemanal>, seletor: string): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(seletor) as NodeListOf<HTMLElement>);
}

function texto(fixture: ComponentFixture<GradeSemanal>, seletor: string): string[] {
    return elementos(fixture, seletor).map((el) => el.textContent?.trim() ?? '');
}

/** Classe `cor-*` aplicada a um card. */
function corDoCard(card: HTMLElement): string {
    return Array.from(card.classList).find((classe) => classe.startsWith('cor-'))!;
}

describe('GradeSemanal', () => {
    it('monta a grade a partir do HorariosService, de segunda a sexta, com os intervalos', () => {
        const fixture = criar();

        expect(texto(fixture, '.cabecalho > div')).toEqual(['Horário', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
        expect(elementos(fixture, '.linha:not(.linha-intervalo)').length).toBe(6);
        expect(elementos(fixture, '.linha-intervalo').length).toBe(2);
        expect(elementos(fixture, '.etiqueta-materia').length).toBe(30);
    });

    it('mostra o professor responsável logo abaixo da matéria (#114)', () => {
        const fixture = criar();
        const primeiroCard = elementos(fixture, '.etiqueta-materia')[0];

        expect(primeiroCard.querySelector('.etiqueta-materia__nome')?.textContent?.trim()).toBe('Projeto Integrador I');
        expect(primeiroCard.querySelector('.etiqueta-materia__professor')?.textContent?.trim()).toBe('Prof. Glauco Todesco');
    });

    it('mostra "Professor a definir" quando a aula não tem professor (#114)', () => {
        const fixture = criar([
            { tipo: 'aula', diaSemana: 'seg', inicio: '13:20', termino: '14:10', materia: 'Banco de Dados', professor: '', sala: 'Lab. 01' },
        ]);

        expect(texto(fixture, '.etiqueta-materia__professor--a-definir')).toEqual([PROFESSOR_A_DEFINIR]);
    });

    it('usa só cores da paleta e a mesma cor para a mesma matéria (#115)', () => {
        const fixture = criar();
        const corPorMateria = new Map<string, string>();

        for (const card of elementos(fixture, '.etiqueta-materia')) {
            const cor = corDoCard(card);
            const materia = card.querySelector('.etiqueta-materia__nome')!.textContent!.trim();
            expect(PALETA_MATERIAS.map((nome) => `cor-${nome}`)).toContain(cor);
            expect(corPorMateria.get(materia) ?? cor).toBe(cor);
            corPorMateria.set(materia, cor);
        }
        expect(new Set(corPorMateria.values()).size).toBe(corPorMateria.size);
    });

    it('sorteia as cores de novo a cada carregamento, sem prender a cor à matéria (#115)', () => {
        const aleatorio = spyOn(Math, 'random');

        aleatorio.and.returnValue(0);
        const primeira = corDoCard(elementos(criar(), '.etiqueta-materia')[0]);

        TestBed.resetTestingModule();
        aleatorio.and.returnValue(0.99);
        const segunda = corDoCard(elementos(criar(), '.etiqueta-materia')[0]);

        expect(primeira).not.toBe(segunda);
    });

    it('inclui a coluna de sábado só quando há aula no sábado', () => {
        const fixture = criar([
            { tipo: 'aula', diaSemana: 'sab', inicio: '13:20', termino: '14:10', materia: 'Banco de Dados', professor: 'Prof. Renato', sala: 'Lab. 01' },
        ]);

        expect(texto(fixture, '.cabecalho > div').at(-1)).toBe('Sábado');
        expect(elementos(fixture, '.linha:not(.linha-intervalo) .celula').length).toBe(6);
    });
});
