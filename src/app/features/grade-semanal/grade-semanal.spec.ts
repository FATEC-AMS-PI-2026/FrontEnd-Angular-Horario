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

    it('abre as informações da aula clicada, mesmo quando a matéria se repete', () => {
        const fixture = criar([
            alocacaoTeste(),
            alocacaoTeste({ id: 2, diaSemana: 'TERCA',
                professor: { id: 2, nome: 'Prof. Glauco Todesco' }, sala: { id: 2, codigo: 'Sala 11' },
            }),
        ]);
        const service = TestBed.inject(HorariosService);
        const antes = service.itens();
        const carregar = spyOn(service, 'carregar').and.callThrough();
        const botoes = elementos(fixture, '.etiqueta-materia');

        botoes[1].click();
        fixture.detectChanges();
        expect(texto(fixture, 'dialog dd')).toEqual(['Banco de Dados', 'Prof. Glauco Todesco', 'Sala 11']);
        expect((fixture.nativeElement.querySelector('dialog') as HTMLDialogElement).matches(':modal')).toBeTrue();
        elementos(fixture, '.modal__botao')[0].click();
        fixture.detectChanges();

        botoes[0].click();
        fixture.detectChanges();
        expect(texto(fixture, 'dialog dd')).toEqual(['Banco de Dados', 'Prof. Renato', 'Lab. 01']);
        expect(service.itens()).toBe(antes);
        expect(carregar).not.toHaveBeenCalled();
    });

    it('mostra os rótulos a definir quando professor e sala estão ausentes', () => {
        const fixture = criar([alocacaoTeste({ professor: null, sala: null })]);
        elementos(fixture, '.etiqueta-materia')[0].click();
        fixture.detectChanges();
        expect(texto(fixture, 'dialog dd')).toEqual(['Banco de Dados', PROFESSOR_A_DEFINIR, 'Sala a definir']);
    });

    it('trata os dados ainda a definir das aulas adicionadas sem inventar professor ou sala', () => {
        const fixture = criar([alocacaoTeste({ professor: null, sala: null })]);
        const service = TestBed.inject(HorariosService);
        expect(service.adicionarAula({
            diaSemana: 'sab', materia: 'Banco de Dados', bloco: { inicio: '13:20', termino: '14:10' },
        }).ok).toBeTrue();
        fixture.detectChanges();
        elementos(fixture, '.etiqueta-materia').at(-1)!.click();
        fixture.detectChanges();
        expect(texto(fixture, 'dialog dd')).toEqual(['Banco de Dados', PROFESSOR_A_DEFINIR, 'Sala a definir']);
    });

    it('oferece botões nativos para teclado somente nas células com aula', () => {
        const fixture = criar();
        const botoes = elementos(fixture, '.etiqueta-materia') as HTMLButtonElement[];
        expect(botoes.every(botao => botao.tagName === 'BUTTON' && botao.type === 'button'
            && botao.tabIndex === 0 && botao.getAttribute('aria-haspopup') === 'dialog')).toBeTrue();
        expect(elementos(fixture, '.linha-intervalo button').length).toBe(0);
        const vazias = elementos(fixture, '.celula').filter(celula => !celula.querySelector('.etiqueta-materia'));
        vazias.forEach(celula => celula.click());
        fixture.detectChanges();
        expect(elementos(fixture, 'dialog').length).toBe(0);
    });

    it('mantém o foco no modal e o devolve ao bloco ao fechar pelos botões ou Escape', () => {
        const fixture = criar([alocacaoTeste()]);
        const botao = elementos(fixture, '.etiqueta-materia')[0];
        for (const acao of ['icone', 'botao', 'escape']) {
            botao.focus();
            botao.click();
            fixture.detectChanges();
            const dialogo = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
            expect(dialogo.getAttribute('aria-modal')).toBe('true');
            expect(dialogo.getAttribute('aria-labelledby')).toBe('informacoes-materia-titulo');
            expect(document.activeElement).toBe(dialogo.querySelector('.modal__fechar'));
            botao.focus();
            expect(dialogo.contains(document.activeElement)).toBeTrue();

            if (acao === 'escape') {
                // Escape dispara cancel nativamente em um HTMLDialogElement modal.
                const evento = new Event('cancel', { cancelable: true });
                dialogo.dispatchEvent(evento);
                expect(evento.defaultPrevented).toBeTrue();
            } else {
                (dialogo.querySelector(acao === 'icone' ? '.modal__fechar' : '.modal__botao') as HTMLElement).click();
            }
            fixture.detectChanges();
            expect(elementos(fixture, 'dialog').length).toBe(0);
            expect(document.activeElement).toBe(botao);
        }
    });

    it('remove o diálogo modal ao sair da página', () => {
        const fixture = criar([alocacaoTeste()]);
        elementos(fixture, '.etiqueta-materia')[0].click();
        fixture.detectChanges();
        const dialogo = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
        fixture.destroy();
        expect(dialogo.open).toBeFalse();
        expect(document.querySelector('dialog:modal')).toBeNull();
    });

    it('mantém Tab e Shift+Tab entre as ações do diálogo', () => {
        const fixture = criar([alocacaoTeste()]);
        elementos(fixture, '.etiqueta-materia')[0].click();
        fixture.detectChanges();
        const primeiro = elementos(fixture, '.modal__fechar')[0];
        const ultimo = elementos(fixture, '.modal__botao')[0];
        const voltar = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
        primeiro.dispatchEvent(voltar);
        expect(voltar.defaultPrevented).toBeTrue();
        expect(document.activeElement).toBe(ultimo);
        const avancar = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        ultimo.dispatchEvent(avancar);
        expect(avancar.defaultPrevented).toBeTrue();
        expect(document.activeElement).toBe(primeiro);
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
