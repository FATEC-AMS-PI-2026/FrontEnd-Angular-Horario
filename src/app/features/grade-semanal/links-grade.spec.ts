import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { GradeSemanal } from './grade-semanal';
import { CARREGAR_GRADE_SEMANAL } from '../horarios/services/grade-semanal-source';
import { alocacaoTeste } from '../horarios/testing/grade-semanal.fixture';

@Component({ template: '<h2>Destino de teste</h2>' })
class DestinoTeste {}

describe('Links do modal da Grade Semanal (#170)', () => {
    const fonte = () => of([alocacaoTeste({ origem: 'local', disciplina: { id: 7, nome: 'Disciplina selecionada', periodo: 1 },
        professor: { id: 3, nome: 'Docente correto' }, sala: { id: 2, codigo: 'Sala correta' },
    })]);
    beforeEach(() => TestBed.configureTestingModule({ providers: [
        provideRouter([{ path: 'grade-semanal', component: GradeSemanal },
            { path: 'salas/:id', component: DestinoTeste }, { path: 'professores', component: DestinoTeste }]),
        { provide: CARREGAR_GRADE_SEMANAL, useValue: fonte },
    ] }));

    it('mantém a matéria como texto, gera dois links acessíveis e restaura o foco ao voltar', async () => {
        const harness = await RouterTestingHarness.create('/grade-semanal');
        const botao = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.etiqueta-materia')!;
        botao.click();
        harness.detectChanges();
        const dialogo = harness.routeNativeElement!.querySelector('dialog')!;
        const links = Array.from(dialogo.querySelectorAll<HTMLAnchorElement>('a'));
        expect(links.map(a => a.getAttribute('href'))).toEqual([
            '/professores?professor=local-3', '/salas/local-2',
        ]);
        const materia = dialogo.querySelector('.modal__valor')!;
        expect(materia.textContent).toBe('Disciplina selecionada');
        expect(materia.querySelector('a')).toBeNull();
        expect(links.every(a => a.tabIndex === 0)).toBeTrue();
        links[0].click();
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(TestBed.inject(Router).url).toBe('/professores?professor=local-3');
        expect(document.querySelector('dialog:modal')).toBeNull();
        await harness.navigateByUrl('/grade-semanal');
        await harness.fixture.whenStable();
        expect(document.activeElement?.getAttribute('data-bloco')).toBe('seg:13:20');
        expect(harness.routeNativeElement!.querySelectorAll('.etiqueta-materia').length).toBe(1);
    });

    it('navega ao professor e à sala pelos seus próprios IDs, sem modificar a consulta da grade', async () => {
        const harness = await RouterTestingHarness.create('/grade-semanal');
        for (const [campo, destino] of [[0, '/professores?professor=local-3'], [1, '/salas/local-2']] as const) {
            harness.routeNativeElement!.querySelector<HTMLButtonElement>('.etiqueta-materia')!.click();
            harness.detectChanges();
            harness.routeNativeElement!.querySelectorAll<HTMLAnchorElement>('dialog a')[campo].click();
            await harness.fixture.whenStable();
            expect(TestBed.inject(Router).url).toBe(destino);
            expect(document.querySelector('dialog:modal')).toBeNull();
            await harness.navigateByUrl('/grade-semanal');
        }
    });

    it('preserva os namespaces Java nos mesmos números', () => {
        TestBed.overrideProvider(CARREGAR_GRADE_SEMANAL, { useValue: () => of([alocacaoTeste({ origem: 'java' })]) });
        const fixture = TestBed.createComponent(GradeSemanal);
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.etiqueta-materia').click();
        fixture.detectChanges();
        const hrefs = () => Array.from(fixture.nativeElement.querySelectorAll('dialog a') as NodeListOf<HTMLAnchorElement>)
            .map(a => a.getAttribute('href'));
        expect(hrefs()).toEqual(['/professores?professor=1', '/salas/1']);
    });

    it('informa detalhes indisponíveis para professor e sala sem identidade confirmada', () => {
        TestBed.overrideProvider(CARREGAR_GRADE_SEMANAL, { useValue: () => of([alocacaoTeste()]) });
        const fixture = TestBed.createComponent(GradeSemanal);
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.etiqueta-materia').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('dialog a').length).toBe(0);
        expect(fixture.nativeElement.querySelectorAll('dialog small').length).toBe(2);
        expect(fixture.nativeElement.textContent).toContain('identidade do professor não confirmada');
        expect(fixture.nativeElement.textContent).toContain('identidade da sala não confirmada');
    });

    it('mantém professor e sala a definir como texto sem link ou aviso de detalhes', () => {
        TestBed.overrideProvider(CARREGAR_GRADE_SEMANAL, { useValue: () => of([alocacaoTeste({ professor: null, sala: null })]) });
        const fixture = TestBed.createComponent(GradeSemanal);
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.etiqueta-materia').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('dialog a').length).toBe(0);
        expect(fixture.nativeElement.querySelectorAll('dialog small').length).toBe(0);
        expect(fixture.nativeElement.textContent).toContain('Professor a definir');
        expect(fixture.nativeElement.textContent).toContain('Sala a definir');
    });
});
