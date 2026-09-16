import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Login } from './login';
import { AuthService } from '../../services/auth.service';

describe('Login', () => {
  let component: Login;
  let response: Subject<string>;
  let auth: jasmine.SpyObj<AuthService>;
  let navigate: jasmine.Spy;
  beforeEach(() => {
    response = new Subject<string>();
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    auth.login.and.returnValue(response);
    TestBed.configureTestingModule({ imports: [Login], providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    component = TestBed.createComponent(Login).componentInstance;
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });
  it('não envia formulário vazio ou identificador em branco', () => {
    component.onLogin();
    component.form.setValue({ identificador: '  ', senha: 'senha' });
    component.onLogin();
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('aguarda o serviço e impede envio duplicado', () => {
    component.form.setValue({ identificador: ' ana@cps.sp.gov.br ', senha: 'senha' });
    component.onLogin();
    component.onLogin();
    expect(auth.login).toHaveBeenCalledOnceWith('ana@cps.sp.gov.br', 'senha');
    expect(component.loading).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
    response.next('/setup/period-selection');
    response.complete();
    expect(navigate).toHaveBeenCalledOnceWith('/setup/period-selection');
    expect(component.loading).toBeFalse();
  });
  it('mostra erro de credenciais e permite tentar novamente', () => {
    component.form.setValue({ identificador: '123', senha: 'senha' });
    component.onLogin();
    response.error(new HttpErrorResponse({ status: 401 }));
    expect(component.errorMessage).toContain('inválidos');
    expect(component.loading).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
  });
});
