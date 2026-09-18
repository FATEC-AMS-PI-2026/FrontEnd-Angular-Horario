import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { ProfileSetupService } from '../../profile-setup/services/profile-setup.service';
import { SessionService } from '../../../core/services/session.service';
import { environment } from '../../../../environments/environment';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';

describe('AuthService: fluxo dinâmico', () => {
    let auth: AuthService;
    let http: HttpTestingController;
    const base = environment.apiUrl;
    const usuario = { nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: 'ADS', periodo: '2º período' };

    beforeEach(() => {
        localStorage.removeItem('gini_token');
        localStorage.removeItem('gini_usuario');
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
                { provide: BACKEND_CONFIG, useValue: { habilitado: true, url: base } }],
        });
        auth = TestBed.inject(AuthService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        localStorage.removeItem('gini_token');
        localStorage.removeItem('gini_usuario');
    });

    for (const concluido of [false, true]) {
        it(`consulta o perfil antes de redirecionar: configurado=${concluido}`, () => {
            const next = jasmine.createSpy('next');
            auth.login('ana@cps.sp.gov.br', 'senha').subscribe(next);
            const login = http.expectOne(`${base}/auth/login`);
            expect(login.request.body).toEqual({ identificador: usuario.email, senha: 'senha' });
            login.flush({ token: 'token-api' });
            expect(next).not.toHaveBeenCalled();
            expect(localStorage.getItem('gini_token')).toBeNull();
            const perfil = http.expectOne(`${base}/usuarios/me/perfil`);
            expect(perfil.request.headers.get('Authorization')).toBe('Bearer token-api');
            perfil.flush({ usuario, cursoId: 'ads', disciplinasIds: [], configuracaoInicialConcluida: concluido });
            expect(next).toHaveBeenCalledOnceWith(concluido ? '/setup/period-selection' : '/setup/course-selection');
            expect(TestBed.inject(SessionService).usuario()).toEqual(usuario);
            expect(localStorage.getItem('gini_token')).toBe('token-api');
        });
    }

    it('cadastra pela API e inicia a escolha de curso', () => {
        const next = jasmine.createSpy('next');
        auth.cadastrar({ nome: 'Ana', email: usuario.email, senha: 'senha' }).subscribe(next);
        const request = http.expectOne(`${base}/auth/cadastro`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body.confirmarSenha).toBeUndefined();
        request.flush({ token: 'novo-token' });
        http.expectOne(`${base}/usuarios/me/perfil`).flush({
            usuario: { ...usuario, curso: '', periodo: '' }, cursoId: null,
            disciplinasIds: [], configuracaoInicialConcluida: false,
        });
        expect(next).toHaveBeenCalledOnceWith('/setup/course-selection');
    });

    it('não mantém sessão ou perfil da conta anterior quando a consulta falha', () => {
        TestBed.inject(SessionService).iniciar('antigo', usuario);
        const error = jasmine.createSpy('error');
        auth.login(usuario.email, 'senha').subscribe({ error });
        http.expectOne(`${base}/auth/login`).flush({ token: 'novo' });
        http.expectOne(`${base}/usuarios/me/perfil`).flush({}, { status: 500, statusText: 'Error' });
        expect(error).toHaveBeenCalled();
        expect(TestBed.inject(ProfileSetupService).perfil()).toBeNull();
        expect(TestBed.inject(SessionService).usuario()).toBeNull();
        expect(localStorage.getItem('gini_token')).toBeNull();
    });

    it('não consulta perfil quando as credenciais são recusadas', () => {
        const error = jasmine.createSpy('error');
        auth.login(usuario.email, 'incorreta').subscribe({ error });
        http.expectOne(`${base}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
        http.expectNone(`${base}/usuarios/me/perfil`);
        expect(error).toHaveBeenCalled();
    });

    it('rejeita token vazio e status de perfil ausente', () => {
        const error = jasmine.createSpy('error');
        auth.login(usuario.email, 'senha').subscribe({ error });
        http.expectOne(`${base}/auth/login`).flush({ token: '' });
        http.expectNone(`${base}/usuarios/me/perfil`);
        expect(error).toHaveBeenCalledTimes(1);
        auth.login(usuario.email, 'senha').subscribe({ error });
        http.expectOne(`${base}/auth/login`).flush({ token: 'token' });
        http.expectOne(`${base}/usuarios/me/perfil`).flush({ usuario, cursoId: 'ads', disciplinasIds: [] });
        expect(error).toHaveBeenCalledTimes(2);
        expect(localStorage.getItem('gini_token')).toBeNull();
    });
});
