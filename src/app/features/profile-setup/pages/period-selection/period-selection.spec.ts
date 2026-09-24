import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PeriodSelection } from './period-selection';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { environment } from '../../../../../environments/environment';

describe('PeriodSelection', () => {
    let component: PeriodSelection;
    let fixture: ComponentFixture<PeriodSelection>;
    let setup: ProfileSetupService;
    let http: HttpTestingController;
    let navigate: jasmine.Spy;
    const perfil = {
        usuario: { nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: 'ADS', periodo: '1º semestre' },
        cursoId: 'ads', disciplinasIds: ['bd'], configuracaoInicialConcluida: true,
    };
    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [PeriodSelection], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
        setup = TestBed.inject(ProfileSetupService);
        http = TestBed.inject(HttpTestingController);
        setup.setCourse('ADS', 'ads');
        fixture = TestBed.createComponent(PeriodSelection);
        component = fixture.componentInstance;
        navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        fixture.detectChanges();
        http.expectOne(environment.apiUrl + '/cursos/ads').flush({ periodicidade: 'Semestral', periodos: ['1º semestre', '2º semestre'] });
    });
    afterEach(() => {
        http.verify();
        localStorage.removeItem('gini_token');
        localStorage.removeItem('gini_usuario');
    });
    for (const periodicidade of ['Anual', 'Semestral'] as const) {
        it(`renderiza botões e título de ${periodicidade} apenas com os períodos recebidos`, () => {
            const unidade = periodicidade === 'Anual' ? 'ano' : 'semestre';
            component.carregar();
            http.expectOne(environment.apiUrl + '/cursos/ads').flush({
                periodicidade, periodos: [`1º ${unidade}`, `2º ${unidade}`],
            });
            fixture.detectChanges();
            const tela = fixture.nativeElement as HTMLElement;
            expect(tela.querySelector('h2')?.textContent).toContain(`Selecione o ${unidade}`);
            const botoes = Array.from(tela.querySelectorAll<HTMLButtonElement>('.period-card'));
            expect(botoes.map(b => b.textContent?.trim())).toEqual([`1º ${unidade}`, `2º ${unidade}`]);
            botoes[1].click();
            component.concluir();
            expect(setup.selectedPeriod()).toBe(`2º ${unidade}`);
            expect(navigate).toHaveBeenCalledOnceWith(['/setup/discipline-selection']);
        });
    }

    it('não presume periodicidade quando a fonte não a informa', () => {
        component.carregar();
        http.expectOne(environment.apiUrl + '/cursos/ads').flush({ periodos: ['1º ano'] });
        expect(component.curso()).toBeNull();
        expect(component.errorMessage()).toBeTruthy();
        component.concluir();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('não avança sem um período disponível e leva o primeiro acesso às disciplinas', () => {
        component.selecionar('9º semestre');
        component.concluir();
        expect(navigate).not.toHaveBeenCalled();
        component.selecionar('1º semestre');
        component.concluir();
        expect(navigate).toHaveBeenCalledOnceWith(['/setup/discipline-selection']);
        http.expectNone(environment.apiUrl + '/usuarios/me/perfil');
    });
    it('limpa o catálogo antigo e permite tentar novamente após resposta incompatível', () => {
        component.selecionar('1º semestre');
        component.carregar();
        expect(component.curso()).toBeNull();
        http.expectOne(environment.apiUrl + '/cursos/ads').flush({ periodicidade: 'Semestral', periodos: null });
        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toContain('Não foi possível');
        component.concluir();
        expect(navigate).not.toHaveBeenCalled();
        component.carregar();
        http.expectOne(environment.apiUrl + '/cursos/ads').flush({ periodicidade: 'Semestral', periodos: ['1º semestre'] });
        expect(component.errorMessage()).toBe('');
        expect(setup.selectedPeriod()).toBe('1º semestre');
    });
    it('no retorno aguarda a gravação antes de abrir o dashboard', () => {
        setup.carregarPerfil('token').subscribe();
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil').flush(perfil);
        component.selecionar('2º semestre');
        component.concluir();
        component.concluir();
        const request = http.expectOne(environment.apiUrl + '/usuarios/me/perfil/periodo');
        expect(navigate).not.toHaveBeenCalled();
        request.flush({ ...perfil, usuario: { ...perfil.usuario, periodo: '2º semestre' } });
        expect(navigate).toHaveBeenCalledOnceWith(['/dashboard']);
        expect(component.saving()).toBeFalse();
    });
    it('não navega quando falha a confirmação do período', () => {
        setup.carregarPerfil('token').subscribe();
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil').flush(perfil);
        component.concluir();
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil/periodo').flush({}, { status: 500, statusText: 'Error' });
        expect(navigate).not.toHaveBeenCalled();
        expect(component.saving()).toBeFalse();
        expect(component.errorMessage()).toContain('Não foi possível salvar');
    });
    it('permite alterar disciplinas por escolha explícita no retorno', () => {
        setup.carregarPerfil('token').subscribe();
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil').flush(perfil);
        component.concluir(true);
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil/periodo').flush(perfil);
        expect(navigate).toHaveBeenCalledOnceWith(['/setup/discipline-selection']);
    });
});
