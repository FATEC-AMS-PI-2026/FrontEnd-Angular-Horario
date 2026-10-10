import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { Horarios } from './horarios';
import { RelogioService } from '../salas/services/relogio';
import { of, Subject, throwError } from 'rxjs';
import { CARREGAR_GRADE_SEMANAL } from './services/grade-semanal-source';
import { HorariosService } from './services/horarios';
import { alocacaoTeste, gradeTeste } from './testing/grade-semanal.fixture';
import { provideRouter } from '@angular/router';
import { CARREGAR_GRADE_DIA, CarregarGradeDia } from '../dashboard/services/dashboard.service';
import { AlocacaoResponse, diaSemana } from '../dashboard/models/grade-dia.model';

/** Usa um relógio controlado para o status não depender do horário real. */
function criar(agora: Date | (() => Date), carregar: CarregarGradeDia = data =>
    of(gradeTeste().filter(aula => aula.diaSemana === diaSemana(data)))): ComponentFixture<Horarios> {
    TestBed.configureTestingModule({
        imports: [Horarios],
        providers: [
            provideRouter([]),
            { provide: RelogioService, useValue: { agora: typeof agora === 'function' ? agora : () => agora } },
            { provide: CARREGAR_GRADE_SEMANAL, useValue: () => of(gradeTeste()) },
            { provide: CARREGAR_GRADE_DIA, useValue: carregar },
        ],
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
    const segunda1430 = new Date('2026-09-21T14:30:00-03:00');

    it('exibe um chip por dia de Seg a Sáb e abre no dia de hoje', () => {
        const fixture = criar(segunda1430);
        expect(texto(fixture, '.filtro-chip')).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Seg']);
    });

    it('abre na segunda quando hoje é domingo', () => {
        const fixture = criar(new Date('2026-09-20T10:00:00-03:00'));
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
        expect(fixture.nativeElement.querySelector('.aviso-calendario')).toBeNull();
        expect(fixture.nativeElement.querySelector('.status-reposicao')).toBeNull();
    });

    it('consulta a data de sábado e identifica cada reposição como texto na coluna Status', () => {
        const reposicao = { data: '2026-10-10', diaSemana: 'QUINTA' as const, turno: 'Tarde' };
        const carregar = jasmine.createSpy<CarregarGradeDia>('gradeDia').and.callFake(data => of(data === reposicao.data ? [
            alocacaoTeste({ diaSemana: 'SABADO', reposicao }),
            alocacaoTeste({ id: 2, diaSemana: 'SABADO', reposicao,
                blocoHorario: { id: 2, horaInicio: '15:00', horaFim: '15:50', duracao: 50 } }),
        ] : gradeTeste().filter(aula => aula.diaSemana === diaSemana(data))));
        const fixture = criar(new Date('2026-10-10T13:20:00-03:00'), carregar);
        expect(carregar).toHaveBeenCalledOnceWith('2026-10-10');
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Sáb']);
        expect(texto(fixture, '.tabela-horarios__aula td:nth-child(5) .status-reposicao'))
            .toEqual(['Reposição de aula', 'Reposição de aula']);
        expect(fixture.nativeElement.querySelector('.tabela-horarios__horario .reposicao-aula')).toBeNull();
        expect(texto(fixture, '.status-badge--andamento')).toEqual(['Em andamento']);
        expect(texto(fixture, '.tabela-horarios__intervalo').length).toBe(1);
        expect(fixture.nativeElement.querySelector('.tabela-horarios__intervalo .status-reposicao')).toBeNull();
        expect(fixture.nativeElement.querySelector('.aviso-calendario')).toBeNull();
        clicarChip(fixture, 'Qui');
        expect(carregar.calls.mostRecent().args).toEqual(['2026-10-08']);
        expect(fixture.nativeElement.querySelector('.status-reposicao')).toBeNull();
        fixture.destroy();
    });

    it('respeita uma data sem aula em vez de mostrar a grade recorrente', () => {
        const carregar = jasmine.createSpy<CarregarGradeDia>('gradeDia').and.returnValue(of([]));
        const fixture = criar(new Date('2026-10-12T13:20:00-03:00'), carregar);
        expect(carregar).toHaveBeenCalledOnceWith('2026-10-12');
        expect(texto(fixture, '.tabela-horarios__aula')).toEqual([]);
        expect(texto(fixture, '.tabela-horarios__vazio')).toEqual(['Nenhuma aula cadastrada para Segunda-feira.']);
        fixture.destroy();
    });

    it('cancela o dia anterior sem misturar respostas atrasadas ou simular vazio enquanto carrega', () => {
        const segunda = new Subject<AlocacaoResponse[]>();
        const terca = new Subject<AlocacaoResponse[]>();
        const fixture = criar(segunda1430, data => data === '2026-09-21' ? segunda : terca);
        expect(fixture.nativeElement.textContent).toContain('Carregando seus horários');
        expect(fixture.nativeElement.querySelector('.tabela-horarios__vazio')).toBeNull();
        clicarChip(fixture, 'Ter');
        segunda.next([alocacaoTeste()]);
        terca.next([alocacaoTeste({ diaSemana: 'TERCA' })]);
        fixture.detectChanges();
        expect(texto(fixture, '.tabela-horarios__materia')).toEqual(['Banco de Dados']);
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Ter']);
        fixture.destroy();
        expect(terca.observed).toBeFalse();
    });

    it('oferece nova tentativa quando a agenda da data falha', () => {
        const carregar = jasmine.createSpy<CarregarGradeDia>('gradeDia')
            .and.returnValue(throwError(() => new Error('Falha')));
        const fixture = criar(segunda1430, carregar);
        expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.tabela-horarios__vazio')).toBeNull();
        carregar.and.returnValue(of([alocacaoTeste()]));
        fixture.nativeElement.querySelector('.horarios__card button').click(); fixture.detectChanges();
        expect(texto(fixture, '.tabela-horarios__materia')).toEqual(['Banco de Dados']);
        expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
        fixture.destroy();
    });

    it('abre no sábado acadêmico mesmo quando já é domingo em UTC', () => {
        const carregar = jasmine.createSpy<CarregarGradeDia>('gradeDia').and.returnValue(of([]));
        const fixture = criar(new Date('2026-10-11T01:00:00Z'), carregar);
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Sáb']);
        expect(carregar).toHaveBeenCalledOnceWith('2026-10-10');
        fixture.destroy();
    });

    it('atualiza o status pelo relógio sem precisar selecionar o dia novamente', fakeAsync(() => {
        let agora = new Date('2026-09-21T13:19:59-03:00');
        const fixture = criar(() => agora);
        expect(texto(fixture, '.status-badge--andamento')).toEqual([]);
        agora = new Date('2026-09-21T13:20:00-03:00');
        tick(1000); fixture.detectChanges();
        expect(texto(fixture, '.tabela-horarios__aula--agora .tabela-horarios__horario')).toEqual(['13:20 – 14:10']);
        fixture.destroy();
    }));

    it('renova a data do chip na virada de semana e não mantém a reposição do sábado anterior', fakeAsync(() => {
        let agora = new Date('2026-10-11T23:59:59-03:00');
        const reposicao = { data: '2026-10-10', diaSemana: 'QUINTA' as const, turno: 'Tarde' };
        const carregar = jasmine.createSpy<CarregarGradeDia>('gradeDia').and.callFake(data => of(data === reposicao.data
            ? [alocacaoTeste({ diaSemana: 'SABADO', reposicao })] : []));
        const fixture = criar(() => agora, carregar);
        clicarChip(fixture, 'Sáb');
        expect(texto(fixture, '.status-reposicao')).toEqual(['Reposição de aula']);
        agora = new Date('2026-10-12T00:00:00-03:00');
        tick(1000); fixture.detectChanges();
        expect(carregar.calls.mostRecent().args).toEqual(['2026-10-17']);
        expect(texto(fixture, '.filtro-chip--ativo')).toEqual(['Sáb']);
        expect(texto(fixture, '.status-reposicao')).toEqual([]);
        expect(texto(fixture, '.tabela-horarios__vazio')).toEqual(['Nenhuma aula cadastrada para Sábado.']);
        fixture.destroy();
    }));

    it('cancela uma consulta pendente ao sair e não aceita sua resposta tardia', () => {
        const resposta = new Subject<AlocacaoResponse[]>();
        const fixture = criar(segunda1430, () => resposta);
        const service = TestBed.inject(HorariosService);
        expect(resposta.observed).toBeTrue();
        fixture.destroy();
        expect(resposta.observed).toBeFalse();
        resposta.next([alocacaoTeste()]);
        expect(service.itensDia()).toEqual([]);
        expect(service.carregandoDia()).toBeFalse();
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
