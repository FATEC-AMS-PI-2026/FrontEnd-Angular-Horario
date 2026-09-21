import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Dashboard } from './dashboard';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { CARREGAR_GRADE_DIA, CarregarGradeDia, DashboardService } from './services/dashboard.service';
import { AlocacaoResponse, dataAcademica, diaSemana } from './models/grade-dia.model';
import { SessionService } from '../../core/services/session.service';
import { intervalosDaGrade } from './models/intervalos-grade';

describe('Dashboard', () => {
    let component: Dashboard;
    let fixture: ComponentFixture<Dashboard>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Dashboard],
            providers: [provideRouter([])]
        })
            .compileComponents();

        fixture = TestBed.createComponent(Dashboard);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('informa grade indisponível sem simular zero aulas ou métricas', () => {
        expect(component.indisponivel()).toBeTrue();
        expect(component.carregado()).toBeFalse();
        expect(fixture.nativeElement.querySelectorAll('.stat-card').length).toBe(0);
        expect(fixture.nativeElement.textContent).toContain('Sua grade ainda não está disponível');
        expect(fixture.nativeElement.textContent).not.toContain('Fulano');
    });

    it('abre a lista de salas pelos dois atalhos sem recarregar a aplicação', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const element: HTMLElement = fixture.nativeElement;
        const links = element.querySelectorAll<HTMLAnchorElement>('a[routerLink="/salas"]');
        expect(links.length).toBe(2);
        links.forEach(link => link.click());
        expect(navigate).toHaveBeenCalledTimes(2);
        expect(navigate.calls.allArgs().map(args => args[0].toString())).toEqual(['/salas', '/salas']);
    });

    it('abre a grade semanal pelo atalho de horários', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
        const element: HTMLElement = fixture.nativeElement;
        element.querySelector<HTMLAnchorElement>('a[routerLink="/grade-semanal"]')!.click();
        expect(navigate.calls.mostRecent().args[0].toString()).toBe('/grade-semanal');
    });
});

describe('Dashboard: grade do serviço', () => {
    let resposta: Subject<AlocacaoResponse[]>;
    let carregar: jasmine.Spy<CarregarGradeDia>;
    let fixture: ComponentFixture<Dashboard>;
    let component: Dashboard;
    const aula = (id: number, horaInicio: string, horaFim: string, professor = 1): AlocacaoResponse => ({
        id, disciplina: { id, nome: `Disciplina ${id}`, periodo: 3 },
        professor: { id: professor, nome: `Professor ${professor}` },
        sala: { id: 1, codigo: 'LAB A' }, diaSemana: 'SEGUNDA',
        blocoHorario: { id, horaInicio, horaFim, duracao: 50 },
        turma: { id: 1, codigo: 'ADS', periodo: 3, ano: 2026 },
        quadroHorario: { id: 1, versao: 1 },
    });

    beforeEach(() => {
        resposta = new Subject<AlocacaoResponse[]>();
        carregar = jasmine.createSpy<CarregarGradeDia>('carregar').and.returnValue(resposta);
        TestBed.configureTestingModule({
            imports: [Dashboard], providers: [provideRouter([]),
            { provide: CARREGAR_GRADE_DIA, useValue: carregar }]
        });
        TestBed.inject(SessionService).iniciar('teste', {
            nome: 'Ana', email: 'ana@example.test', curso: 'ADS', periodo: '3º período',
        });
        fixture = TestBed.createComponent(Dashboard);
        component = fixture.componentInstance;
        component.agora.set(new Date('2026-09-14T13:20:00-03:00'));
        fixture.detectChanges();
    });

    afterEach(() => TestBed.inject(SessionService).limpar());

    it('mostra o docente da relação retornada pelo Service na lista e na próxima aula', () => {
        const atual = aula(1, '13:20:00', '14:10:00');
        const futura = aula(2, '14:10:00', '15:00:00');
        futura.professor = { id: 9, nome: 'Lilian Oliveira' };
        resposta.next([atual, futura]); resposta.complete(); fixture.detectChanges();
        const tela: HTMLElement = fixture.nativeElement;
        expect(tela.querySelectorAll('.schedule-item--class')[1].textContent).toContain('Lilian Oliveira');
        expect(tela.querySelectorAll('.stat-card')[2].textContent).toContain('Lilian Oliveira');
        expect(tela.querySelector('.banner__right')?.textContent).toContain('Lilian Oliveira');
    });

    it('mostra professor a definir sem docente e não exibe docente sem próxima aula', () => {
        const futura = aula(2, '14:10:00', '15:00:00'); futura.professor = null;
        resposta.next([futura]); resposta.complete(); fixture.detectChanges();
        const tela: HTMLElement = fixture.nativeElement;
        expect(tela.querySelector('.schedule-item--class')?.textContent).toContain('Professor a definir');
        expect(tela.querySelectorAll('.stat-card')[2].textContent).toContain('Professor a definir');
        component.agora.set(new Date('2026-09-14T16:00:00-03:00')); fixture.detectChanges();
        expect(tela.querySelectorAll('.stat-card')[2].textContent).toContain('Sem próxima aula hoje');
        expect(tela.querySelectorAll('.stat-card')[2].textContent).not.toContain('Professor a definir');
    });

    it('mostra carregamento e calcula resumo, ordem das aulas e salas sem duplicação', () => {
        expect(component.loading()).toBeTrue();
        expect(carregar).toHaveBeenCalledOnceWith('2026-09-14');
        expect(fixture.nativeElement.textContent).toContain('Carregando suas aulas');
        resposta.next([aula(3, '15:10:00', '16:00:00', 2), aula(1, '13:20:00', '14:10:00'), aula(2, '14:10:00', '15:00:00')]);
        resposta.complete();
        fixture.detectChanges();
        expect(component.loading()).toBeFalse();
        expect(component.alocacoes().map(item => item.id)).toEqual([1, 2, 3]);
        expect(component.stats().map(item => item.value)).toEqual(['3', '2', '14:10', '13:20']);
        expect(component.salasHoje().length).toBe(1);
        expect(component.statusSalas()[0].professor).toBe('Professor 1');
        expect(fixture.nativeElement.textContent).toContain('Olá, Ana!');
    });

    it('distingue fim da aula, intervalo e fim do dia sem inventar disponibilidade das salas', () => {
        resposta.next([aula(1, '13:20:00', '14:10:00'), aula(2, '15:10:00', '16:00:00')]);
        resposta.complete();
        component.agora.set(new Date('2026-09-14T14:10:00-03:00'));
        expect(component.emAndamento()).toEqual([]);
        expect(component.proxima()?.id).toBe(2);
        expect(component.statusSalas()[0].label).toBe('Sem aula sua agora');
        component.agora.set(new Date('2026-09-14T16:00:00-03:00'));
        expect(component.proxima()).toBeUndefined();
        expect(component.stats()[3].subtitle).toBe('Nenhuma aula neste momento');
    });

    it('pula os blocos da disciplina atual e mostra a próxima disciplina diferente', () => {
        const engenharia = (id: number, inicio: string, fim: string) => ({
            ...aula(id, inicio, fim), disciplina: { id: 10, nome: 'Engenharia de Software', periodo: 1 },
        });
        resposta.next([engenharia(1, '15:00', '15:50'), engenharia(2, '15:50', '16:40'), aula(3, '17:00', '17:50')]);
        resposta.complete();
        component.agora.set(new Date('2026-09-14T15:16:00-03:00'));
        expect(component.proxima()?.id).toBe(3);
        expect(component.stats()[2].value).toBe('17:00');
        component.agora.set(new Date('2026-09-14T15:50:00-03:00'));
        expect(component.proxima()?.id).toBe(3);
        component.agora.set(new Date('2026-09-14T16:40:00-03:00'));
        expect(component.stats()[3].subtitle).toBe('(intervalo)');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.schedule-item--interval').length).toBe(1);
        expect(component.alocacoes().length).toBe(3);
        component.agora.set(new Date('2026-09-14T17:00:00-03:00'));
        expect(component.intervaloAtual()).toBeUndefined();
        expect(component.emAndamento()[0].id).toBe(3);
    });

    it('compara nomes sem depender dos IDs dos blocos e não esconde aulas antes do início do dia', () => {
        resposta.next([aula(1, '13:20', '14:10'), {
            ...aula(2, '14:10', '15:00'), disciplina: { id: 99, nome: '  DISCIPLINA   1 ', periodo: 1 },
        }]);
        resposta.complete();
        expect(component.proxima()).toBeUndefined();
        component.agora.set(new Date('2026-09-14T12:00:00-03:00'));
        expect(component.proxima()?.id).toBe(1);
        expect(component.intervaloAtual()).toBeUndefined();
    });

    it('calcula lacunas por horários e não cria intervalos para aulas contíguas ou sobrepostas', () => {
        expect(intervalosDaGrade([])).toEqual([]);
        expect(intervalosDaGrade([aula(1, '13:20', '14:10')])).toEqual([]);
        expect(intervalosDaGrade([aula(1, '13:20', '14:10'), aula(2, '14:10:00', '15:00')])).toEqual([]);
        const intervalos = intervalosDaGrade([
            aula(3, '16:10', '17:00'), aula(1, '13:20', '15:00'), aula(2, '14:00', '14:50'),
        ]);
        expect(intervalos.map(i => [i.horaInicio, i.horaFim])).toEqual([['15:00:00', '16:10:00']]);
    });

    it('mostra ausência de aulas apenas após resposta vazia bem-sucedida', () => {
        resposta.next([]);
        resposta.complete();
        fixture.detectChanges();
        expect(component.carregado()).toBeTrue();
        expect(component.stats()[0].value).toBe('0');
        expect(fixture.nativeElement.textContent).toContain('Você não tem aulas programadas');
    });

    it('mostra erro de rede e recarrega sem manter métricas antigas', () => {
        resposta.error(new HttpErrorResponse({ status: 0 }));
        fixture.detectChanges();
        expect(component.errorMessage()).toContain('conectar');
        expect(fixture.nativeElement.querySelectorAll('.stat-card').length).toBe(0);
        carregar.and.returnValue(of([aula(1, '13:20:00', '14:10:00')]));
        fixture.nativeElement.querySelector('button').click();
        expect(component.errorMessage()).toBe('');
        expect(component.carregado()).toBeTrue();
    });

    it('cancela consulta anterior na troca de dia e ignora respostas atrasadas', () => {
        const nova = new Subject<AlocacaoResponse[]>();
        carregar.and.returnValue(nova);
        component.agora.set(new Date('2026-09-15T00:00:00-03:00'));
        component.carregar();
        resposta.next([aula(1, '13:20:00', '14:10:00')]);
        expect(component.alocacoes()).toEqual([]);
        expect(carregar.calls.mostRecent().args).toEqual(['2026-09-15']);
        nova.next([]);
        nova.complete();
        expect(component.carregado()).toBeTrue();
    });

    it('rejeita dados de outro dia, duplicados ou horários inválidos', () => {
        const service = TestBed.inject(DashboardService);
        for (const dados of [
            [aula(1, '25:20', '26:00')],
            [aula(1, '13:20', '14:10'), aula(1, '13:20', '14:10')],
            [{ ...aula(1, '13:20', '14:10'), diaSemana: 'TERCA' as const }],
        ]) {
            carregar.and.returnValue(of(dados));
            const erro = jasmine.createSpy('erro');
            service.carregarDia('2026-09-14').subscribe({ next: () => fail('Não deveria aceitar'), error: erro });
            expect(erro).toHaveBeenCalled();
        }
    });

    it('usa a data acadêmica de São Paulo mesmo após a meia-noite UTC', () => {
        const data = dataAcademica(new Date('2026-09-15T01:00:00Z'));
        expect(data).toBe('2026-09-14');
        expect(diaSemana(data)).toBe('SEGUNDA');
    });
});
