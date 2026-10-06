import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdicionarMateriaModal } from './adicionar-materia-modal';
import { HorariosService } from '../../services/horarios';
import { DiaSemana } from '../../models/item-horario';

function criar(diaInicial: DiaSemana | null = null): ComponentFixture<AdicionarMateriaModal> {
    const fixture = TestBed.createComponent(AdicionarMateriaModal);
    fixture.componentRef.setInput('diaInicial', diaInicial);
    fixture.detectChanges();
    return fixture;
}

function elementos<T extends HTMLElement>(fixture: ComponentFixture<AdicionarMateriaModal>, seletor: string): T[] {
    return Array.from(fixture.nativeElement.querySelectorAll(seletor) as NodeListOf<T>);
}

function texto(fixture: ComponentFixture<AdicionarMateriaModal>, seletor: string): string[] {
    return elementos(fixture, seletor).map((el) => el.textContent?.trim() ?? '');
}

function clicarChip(fixture: ComponentFixture<AdicionarMateriaModal>, rotulo: string): void {
    elementos<HTMLButtonElement>(fixture, '.opcao-chip').find((chip) => chip.textContent?.trim() === rotulo)!.click();
    fixture.detectChanges();
}

function escolherMateria(fixture: ComponentFixture<AdicionarMateriaModal>, materia: string): void {
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = materia;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
}

function clicarBotao(fixture: ComponentFixture<AdicionarMateriaModal>, rotulo: string): void {
    elementos<HTMLButtonElement>(fixture, '.botao').find((botao) => botao.textContent?.trim() === rotulo)!.click();
    fixture.detectChanges();
}

describe('AdicionarMateriaModal', () => {
    it('mostra chips de dia, matérias do service e chips de horário no formato "1ª - 13:20"', () => {
        const fixture = criar();
        const service = TestBed.inject(HorariosService);

        expect(texto(fixture, '.opcao-chip:not(.opcao-chip--horario)')).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
        expect(texto(fixture, 'option:not([disabled])')).toEqual(service.materias());
        expect(texto(fixture, '.opcao-chip--horario')[0]).toBe('1ª - 13:20');
    });

    it('abre com o dia inicial já selecionado', () => {
        const fixture = criar('qua');
        expect(texto(fixture, '.opcao-chip--ativo')).toEqual(['Qua']);
    });

    it('valida os campos obrigatórios e não adiciona nada', () => {
        const fixture = criar();
        const service = TestBed.inject(HorariosService);
        const antes = service.itens().length;
        let emitiu = false;
        fixture.componentInstance.adicionada.subscribe(() => (emitiu = true));

        clicarBotao(fixture, '+ Adicionar');

        expect(texto(fixture, '.campo__erro')).toEqual([
            'Selecione o dia da semana.',
            'Selecione a matéria.',
            'Selecione o horário.',
        ]);
        expect(service.itens().length).toBe(antes);
        expect(emitiu).toBeFalse();
    });

    it('adiciona a aula e emite o dia quando o formulário está completo', () => {
        const fixture = criar();
        const service = TestBed.inject(HorariosService);
        let diaEmitido: DiaSemana | undefined;
        fixture.componentInstance.adicionada.subscribe((dia) => (diaEmitido = dia));

        clicarChip(fixture, 'Sáb');
        escolherMateria(fixture, 'Banco de Dados');
        clicarChip(fixture, '1ª - 13:20');
        clicarBotao(fixture, '+ Adicionar');

        expect(diaEmitido).toBe('sab');
        expect(service.itens()).toContain(
            jasmine.objectContaining({ tipo: 'aula', diaSemana: 'sab', inicio: '13:20', materia: 'Banco de Dados' }),
        );
    });

    it('mostra o erro do service e continua aberto quando o horário já está ocupado', () => {
        const fixture = criar('seg');
        let emitiu = false;
        fixture.componentInstance.adicionada.subscribe(() => (emitiu = true));

        escolherMateria(fixture, 'Banco de Dados');
        clicarChip(fixture, '1ª - 13:20');
        clicarBotao(fixture, '+ Adicionar');

        expect(texto(fixture, '.formulario__erro')).toEqual(['Já existe uma aula nesse dia e horário.']);
        expect(emitiu).toBeFalse();
    });

    it('emite "fechar" ao cancelar, sem adicionar nada', () => {
        const fixture = criar('sab');
        const service = TestBed.inject(HorariosService);
        const antes = service.itens().length;
        let fechou = false;
        fixture.componentInstance.fechar.subscribe(() => (fechou = true));

        escolherMateria(fixture, 'Banco de Dados');
        clicarBotao(fixture, 'Cancelar');

        expect(fechou).toBeTrue();
        expect(service.itens().length).toBe(antes);
    });

    it('emite "fechar" ao clicar no fundo escurecido ou apertar Esc, mas não ao clicar dentro', () => {
        const fixture = criar();
        let fechamentos = 0;
        fixture.componentInstance.fechar.subscribe(() => fechamentos++);

        (fixture.nativeElement.querySelector('.modal') as HTMLElement).click();
        expect(fechamentos).toBe(0);

        (fixture.nativeElement.querySelector('.modal__fundo') as HTMLElement).click();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(fechamentos).toBe(2);
    });
});
