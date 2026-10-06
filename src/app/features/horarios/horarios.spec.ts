import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Horarios } from './horarios';
import { RelogioService } from '../salas/services/relogio';

/** Cria o componente com o "agora" fixo, para o status não depender do relógio real. */
function criar(agora: Date): ComponentFixture<Horarios> {
    TestBed.configureTestingModule({
        imports: [Horarios],
        providers: [{ provide: RelogioService, useValue: { agora: () => agora } }],
    });
    const fixture = TestBed.createComponent(Horarios);
    fixture.detectChanges();
    return fixture;
}

function texto(fixture: ComponentFixture<Horarios>, seletor: string): string[] {
    const elementos = fixture.nativeElement.querySelectorAll(seletor) as NodeListOf<HTMLElement>;
    return Array.from(elementos).map((el) => el.textContent?.trim() ?? '');
}

function clicarChip(fixture: ComponentFixture<Horarios>, rotulo: string): void {
    const chips = fixture.nativeElement.querySelectorAll('.filtro-chip') as NodeListOf<HTMLButtonElement>;
    Array.from(chips).find((chip) => chip.textContent?.trim() === rotulo)!.click();
    fixture.detectChanges();
}

describe('Horarios', () => {
    // 2026-09-21 é uma segunda-feira.
    const segunda1430 = new Date(2026, 8, 21, 14, 30);

    it('exibe um chip por dia de Seg a Sáb e abre no dia de hoje', () => {
        const fixture = criar(segunda1430);
        expect(texto(fixture, '.filtro-chip')).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Seg']);
    });

    it('abre na segunda quando hoje é domingo', () => {
        const fixture = criar(new Date(2026, 8, 20, 10, 0));
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Seg']);
    });

    it('lista aulas em ordem cronológica com intervalos como linhas separadoras', () => {
        const fixture = criar(segunda1430);
        const horarios = texto(fixture, 'tbody .tabela-horarios__horario');
        expect(horarios[0]).toBe('13:20 – 14:10');
        expect(horarios[2]).toBe('15:00 – 15:10');
        expect(texto(fixture, '.tabela-horarios__intervalo').length).toBe(2);
        expect(texto(fixture, '.tabela-horarios__intervalo td:last-child')).toEqual(['Intervalo', 'Intervalo']);
    });

    it('marca a aula em andamento e só a primeira aula futura como próxima', () => {
        const fixture = criar(segunda1430);
        expect(texto(fixture, '.status-badge--andamento')).toEqual(['Em andamento']);
        expect(texto(fixture, '.status-badge--proxima')).toEqual(['Próxima']);
        expect(texto(fixture, '.tabela-horarios__aula--agora .tabela-horarios__horario')).toEqual(['14:10 – 15:00']);
    });

    it('não mostra status em dias diferentes de hoje', () => {
        const fixture = criar(segunda1430);
        clicarChip(fixture, 'Ter');
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Ter']);
        expect(texto(fixture, '.status-badge').length).toBe(0);
        expect(texto(fixture, '.status-traco').length).toBe(6);
    });

    it('mostra mensagem de vazio no sábado sem aulas', () => {
        const fixture = criar(segunda1430);
        clicarChip(fixture, 'Sáb');
        expect(texto(fixture, '.tabela-horarios__vazio')).toEqual(['Nenhuma aula cadastrada para Sábado.']);
    });

    it('abre o modal "Adicionar Matéria" pelo botão e fecha ao cancelar', () => {
        const fixture = criar(segunda1430);
        expect(fixture.nativeElement.querySelector('app-adicionar-materia-modal')).toBeNull();

        (fixture.nativeElement.querySelector('.botao-adicionar') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();

        const botoes = fixture.nativeElement.querySelectorAll('.botao') as NodeListOf<HTMLButtonElement>;
        Array.from(botoes).find((botao) => botao.textContent?.trim() === 'Cancelar')!.click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-adicionar-materia-modal')).toBeNull();
    });

    it('depois de adicionar, fecha o modal e mostra o dia da aula nova na tabela', () => {
        const fixture = criar(segunda1430);
        (fixture.nativeElement.querySelector('.botao-adicionar') as HTMLButtonElement).click();
        fixture.detectChanges();

        const modal = fixture.nativeElement.querySelector('app-adicionar-materia-modal') as HTMLElement;
        const chips = Array.from(modal.querySelectorAll('.opcao-chip') as NodeListOf<HTMLButtonElement>);
        chips.find((chip) => chip.textContent?.trim() === 'Sáb')!.click();
        const select = modal.querySelector('select') as HTMLSelectElement;
        select.value = 'Banco de Dados';
        select.dispatchEvent(new Event('change'));
        chips.find((chip) => chip.textContent?.trim() === '1ª - 13:20')!.click();
        (modal.querySelector('.botao--primario') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('app-adicionar-materia-modal')).toBeNull();
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Sáb']);
        expect(texto(fixture, '.tabela-horarios__materia')).toEqual(['Banco de Dados']);
    });
});
