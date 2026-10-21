import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HorariosHojeCard } from './horarios-hoje-card/horarios-hoje-card';
import { StatusSalasCard } from './status-salas-card/status-salas-card';
import { SalasHojeCard } from './salas-hoje-card/salas-hoje-card';

describe('Cards da dashboard sem acesso a dados próprio', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

    it('aguarda a confirmação da grade antes de anunciar horários vazios', () => {
        const fixture = TestBed.createComponent(HorariosHojeCard);
        fixture.componentRef.setInput('horarios', []);
        fixture.componentRef.setInput('dia', 'quinta-feira');
        fixture.componentRef.setInput('data', '08/10/2026');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).not.toContain('Você não tem aulas');
        fixture.componentRef.setInput('carregado', true);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Você não tem aulas programadas para hoje.');
    });

    it('encaminha as novas tentativas remota e local separadamente, sem consultar serviços', () => {
        const fixture = TestBed.createComponent(StatusSalasCard);
        fixture.componentRef.setInput('grupos', []);
        fixture.componentRef.setInput('aviso', 'Falha da agenda remota');
        fixture.componentRef.setInput('erroLocal', 'Falha da leitura local');
        const remoto = jasmine.createSpy('remoto');
        const local = jasmine.createSpy('local');
        fixture.componentInstance.tentarNovamente.subscribe(remoto);
        fixture.componentInstance.tentarNovamenteLocal.subscribe(local);
        fixture.detectChanges();
        const tela: HTMLElement = fixture.nativeElement;
        expect(tela.textContent).not.toContain('Nenhuma sala cadastrada');
        const botoes = tela.querySelectorAll<HTMLButtonElement>('button');
        botoes[0].click();
        expect(remoto).toHaveBeenCalledTimes(1);
        expect(local).not.toHaveBeenCalled();
        botoes[1].click();
        expect(remoto).toHaveBeenCalledTimes(1);
        expect(local).toHaveBeenCalledTimes(1);
    });

    it('distingue carregamento, grade indisponível, falha e salas de hoje vazias', () => {
        const fixture = TestBed.createComponent(SalasHojeCard);
        fixture.componentRef.setInput('salas', []);
        fixture.componentRef.setInput('carregando', true);
        fixture.detectChanges();
        const tela: HTMLElement = fixture.nativeElement;
        expect(tela.getAttribute('aria-busy')).toBe('true');
        expect(tela.textContent).toContain('Carregando suas salas de hoje');
        expect(tela.textContent).not.toContain('Nenhuma sala vinculada');
        fixture.componentRef.setInput('carregando', false);
        fixture.componentRef.setInput('indisponivel', true);
        fixture.detectChanges();
        expect(tela.textContent).toContain('Sua grade ainda não está disponível');
        fixture.componentRef.setInput('indisponivel', false);
        fixture.componentRef.setInput('erro', 'Falha na grade');
        fixture.detectChanges();
        expect(tela.textContent).toContain('após carregar suas aulas');
        fixture.componentRef.setInput('erro', '');
        fixture.componentRef.setInput('carregado', true);
        fixture.detectChanges();
        expect(tela.getAttribute('aria-busy')).toBe('false');
        expect(tela.textContent).toContain('Nenhuma sala vinculada às suas aulas de hoje.');
    });
});
