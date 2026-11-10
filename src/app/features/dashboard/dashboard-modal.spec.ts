import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { AlocacaoResponse } from './models/grade-dia.model';
import { CARREGAR_GRADE_DIA } from './services/dashboard.service';
import { alocacaoTeste } from '../horarios/testing/grade-semanal.fixture';
import { ConsultaSalasService } from '../salas/services/consulta-salas';
import { RelogioService } from '../salas/services/relogio';

describe('Dashboard: informações das aulas de hoje', () => {
    let fixture: ComponentFixture<Dashboard>;
    let carregar: jasmine.Spy;
    let dados: AlocacaoResponse[];
    let instante: Date;

    const aula = (id: number, inicio: string, fim: string, mudancas: Partial<AlocacaoResponse> = {}) =>
        alocacaoTeste({ id, origem: 'local', blocoHorario: {
            id, horaInicio: inicio, horaFim: fim, duracao: 50,
        }, ...mudancas });

    beforeEach(() => {
        instante = new Date('2026-09-14T13:20:00-03:00');
        carregar = jasmine.createSpy('carregarDia').and.callFake(() => of(dados));
        TestBed.configureTestingModule({ imports: [Dashboard], providers: [
            provideRouter([]), { provide: CARREGAR_GRADE_DIA, useValue: carregar },
            { provide: RelogioService, useValue: { agora: () => instante } },
        ] }).overrideComponent(Dashboard, { set: { providers: [
            { provide: ConsultaSalasService, useValue: {
                salas: signal([]), carregando: signal(false), erro: signal(null),
                estadoAgenda: signal({ carregando: false, erro: null }),
                locais: { erro: signal(null) },
            } },
        ] } });
    });

    function abrir(alocacoes: AlocacaoResponse[]): HTMLElement {
        dados = alocacoes;
        fixture = TestBed.createComponent(Dashboard);
        fixture.detectChanges();
        return fixture.nativeElement;
    }

    function clicarAula(indice = 0): HTMLButtonElement {
        const botao = fixture.nativeElement.querySelectorAll('button.schedule-item--class')[indice] as HTMLButtonElement;
        botao.focus(); botao.click(); fixture.detectChanges();
        return botao;
    }

    function fechar(): void {
        fixture.nativeElement.querySelector('.modal__botao').click();
        fixture.detectChanges();
    }

    it('abre o mesmo modal da Grade Semanal com os dados da alocação clicada, mesmo repetindo a matéria', () => {
        const tela = abrir([aula(1, '13:20', '14:10'), aula(2, '14:20', '15:10', {
            professor: { id: 2, nome: 'Outra docente' }, sala: { id: 2, codigo: 'Sala 11' },
        })]);
        const antes = fixture.componentInstance.alocacoes();
        const botao = clicarAula(1);
        expect(botao.type).toBe('button');
        expect(botao.getAttribute('aria-haspopup')).toBe('dialog');
        expect(botao.getAttribute('aria-label')).toContain('das 14:20 às 15:10');
        expect(tela.querySelector('app-informacoes-materia-modal')).not.toBeNull();
        expect((tela.querySelector('dialog') as HTMLDialogElement).open).toBeTrue();
        expect(Array.from(tela.querySelectorAll('.modal__valor')).map(el => el.textContent?.trim()))
            .toEqual(['Banco de Dados', 'Outra docente', 'Sala 11']);
        fechar();
        expect(document.activeElement).toBe(botao);
        expect(fixture.componentInstance.alocacoes()).toBe(antes);
        expect(carregar).toHaveBeenCalledTimes(1);
    });

    it('permite clicar no horário e mantém intervalos sem ação ou foco de botão', () => {
        const tela = abrir([aula(1, '13:20', '14:10'), aula(2, '14:20', '15:10')]);
        const intervalo = tela.querySelector<HTMLElement>('.schedule-item--interval')!;
        expect(intervalo.tagName).toBe('DIV');
        expect(intervalo.hasAttribute('tabindex')).toBeFalse();
        intervalo.click(); fixture.detectChanges();
        expect(tela.querySelector('dialog')).toBeNull();
        tela.querySelector<HTMLElement>('.time-block')!.click(); fixture.detectChanges();
        expect(tela.querySelector('dialog')).not.toBeNull();
        expect(carregar).toHaveBeenCalledTimes(1);
    });

    it('mostra dados a definir sem inventar links quando professor e sala estão ausentes', () => {
        const tela = abrir([aula(1, '13:20', '14:10', { professor: null, sala: null })]);
        clicarAula();
        expect(Array.from(tela.querySelectorAll('.modal__valor')).map(el => el.textContent?.trim()))
            .toEqual(['Banco de Dados', 'Professor a definir', 'Sala a definir']);
        expect(tela.querySelector('dialog a')).toBeNull();
    });

    it('não deduz a origem pelos IDs e informa quando a identidade dos detalhes não está confirmada', () => {
        const tela = abrir([aula(1, '13:20', '14:10', { origem: undefined })]);
        clicarAula();
        expect(tela.querySelector('dialog a')).toBeNull();
        expect(tela.querySelectorAll('dialog small').length).toBe(2);
        expect(tela.querySelector('dialog')?.textContent).toContain('identidade do professor não confirmada');
        expect(tela.querySelector('dialog')?.textContent).toContain('identidade da sala não confirmada');
    });

    it('mantém os links locais e Java distintos e fecha o modal ao navegar', () => {
        const tela = abrir([aula(1, '13:20', '14:10'), aula(2, '14:10', '15:00', { origem: 'java' })]);
        const navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        for (const [indice, prefixo] of [[0, 'local-'], [1, '']] as const) {
            for (const campo of ['professor', 'sala']) {
                clicarAula(indice);
                const links = tela.querySelectorAll<HTMLAnchorElement>('dialog a');
                const professor = campo === 'professor';
                const esperado = professor ? `/professores?professor=${prefixo}1` : `/salas/${prefixo}1`;
                const link = links[professor ? 0 : 1];
                expect(link.getAttribute('href')).toBe(esperado);
                link.click(); fixture.detectChanges();
                expect(tela.querySelector('dialog')).toBeNull();
                expect(navegar.calls.mostRecent().args[0].toString()).toBe(esperado);
            }
        }
        expect(carregar).toHaveBeenCalledTimes(1);
    });

    it('fecha pelo ícone, pelo botão e por Escape e devolve o foco à aula', () => {
        const tela = abrir([aula(1, '13:20', '14:10')]);
        for (const acao of ['icone', 'botao', 'escape']) {
            const botao = clicarAula();
            const dialogo = tela.querySelector<HTMLDialogElement>('dialog')!;
            expect(dialogo.getAttribute('aria-modal')).toBe('true');
            if (acao === 'escape') dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
            else tela.querySelector<HTMLElement>(acao === 'icone' ? '.modal__fechar' : '.modal__botao')!.click();
            fixture.detectChanges();
            expect(tela.querySelector('dialog')).toBeNull();
            expect(document.activeElement).toBe(botao);
        }
    });

    it('mantém o foco por Tab dentro do diálogo e encerra o modal ao sair da dashboard', () => {
        const tela = abrir([aula(1, '13:20', '14:10')]);
        clicarAula();
        const primeiro = tela.querySelector<HTMLElement>('.modal__fechar')!;
        const ultimo = tela.querySelector<HTMLElement>('.modal__botao')!;
        primeiro.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Tab', shiftKey: true, bubbles: true, cancelable: true,
        }));
        expect(document.activeElement).toBe(ultimo);
        ultimo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(primeiro);
        const dialogo = tela.querySelector<HTMLDialogElement>('dialog')!;
        fixture.destroy();
        expect(dialogo.open).toBeFalse();
        expect(document.querySelector('dialog:modal')).toBeNull();
    });

    it('fecha as informações antigas ao recarregar as aulas', () => {
        const tela = abrir([aula(1, '13:20', '14:10')]);
        clicarAula();
        const dialogo = tela.querySelector<HTMLDialogElement>('dialog')!;
        dados = [];
        fixture.componentInstance.carregar(); fixture.detectChanges();
        expect(tela.querySelector('dialog')).toBeNull();
        expect(dialogo.open).toBeFalse();
        expect(tela.textContent).toContain('Você não tem aulas programadas para hoje.');
        expect(carregar).toHaveBeenCalledTimes(2);
    });

    it('reutiliza o modal para uma reposição no domingo sem inventar um dia da grade semanal', () => {
        instante = new Date('2026-09-20T13:20:00-03:00');
        const tela = abrir([aula(1, '13:20', '14:10', { diaSemana: 'DOMINGO',
            reposicao: { data: '2026-09-20', diaSemana: 'SEGUNDA', turno: 'Tarde' } })]);
        expect(tela.querySelector('.schedule-item .reposicao-aula')).not.toBeNull();
        clicarAula();
        expect(tela.querySelector('dialog .modal__valor')?.textContent?.trim()).toBe('Banco de Dados');
        expect(tela.querySelector('dialog a')?.getAttribute('href')).toBe('/professores?professor=local-1');
    });
});
