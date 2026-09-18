import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PeriodSelection } from './period-selection';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { environment } from '../../../../../environments/environment';

describe('PeriodSelection', () => {
    let component: PeriodSelection;
    let setup: ProfileSetupService;
    let http: HttpTestingController;
    let navigate: jasmine.Spy;
    const perfil = {
        usuario: { nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: 'ADS', periodo: '1º período' },
        cursoId: 'ads', disciplinasIds: ['bd'], configuracaoInicialConcluida: true,
    };
    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [PeriodSelection], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
        setup = TestBed.inject(ProfileSetupService);
        http = TestBed.inject(HttpTestingController);
        setup.setCourse('ADS', 'ads');
        component = TestBed.createComponent(PeriodSelection).componentInstance;
        navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        component.ngOnInit();
        http.expectOne(environment.apiUrl + '/cursos/ads').flush({ periodos: ['1º período', '2º período'] });
    });
    afterEach(() => {
        http.verify();
        localStorage.removeItem('gini_token');
        localStorage.removeItem('gini_usuario');
    });
    it('não avança sem um período disponível e leva o primeiro acesso às disciplinas', () => {
        component.selecionar('9º período');
        component.concluir();
        expect(navigate).not.toHaveBeenCalled();
        component.selecionar('1º período');
        component.concluir();
        expect(navigate).toHaveBeenCalledOnceWith(['/setup/discipline-selection']);
        http.expectNone(environment.apiUrl + '/usuarios/me/perfil');
    });
    it('limpa o catálogo antigo e permite tentar novamente após resposta incompatível', () => {
        component.selecionar('1º período');
        component.carregar();
        expect(component.curso()).toBeNull();
        http.expectOne(environment.apiUrl + '/cursos/ads').flush({ periodos: null });
        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toContain('Não foi possível');
        component.concluir();
        expect(navigate).not.toHaveBeenCalled();
        component.carregar();
        http.expectOne(environment.apiUrl + '/cursos/ads').flush({ periodos: ['1º período'] });
        expect(component.errorMessage()).toBe('');
        expect(setup.selectedPeriod()).toBe('1º período');
    });
    it('no retorno aguarda a gravação antes de abrir o dashboard', () => {
        setup.carregarPerfil('token').subscribe();
        http.expectOne(environment.apiUrl + '/usuarios/me/perfil').flush(perfil);
        component.selecionar('2º período');
        component.concluir();
        component.concluir();
        const request = http.expectOne(environment.apiUrl + '/usuarios/me/perfil/periodo');
        expect(navigate).not.toHaveBeenCalled();
        request.flush({ ...perfil, usuario: { ...perfil.usuario, periodo: '2º período' } });
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
