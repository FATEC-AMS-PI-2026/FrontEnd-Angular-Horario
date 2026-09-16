import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { Cadastro } from './cadastro';
import { AuthService } from '../../services/auth.service';

describe('Cadastro', () => {
  let component: Cadastro;
  let auth: jasmine.SpyObj<AuthService>;
  let response: Subject<string>;
  let navigate: jasmine.Spy;
  beforeEach(() => {
    response = new Subject<string>();
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['cadastrar']);
    auth.cadastrar.and.returnValue(response);
    TestBed.configureTestingModule({ imports: [Cadastro], providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    component = TestBed.createComponent(Cadastro).componentInstance;
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });
  it('não envia dados inválidos ou senhas diferentes', () => {
    component.cadastrar();
    component.cadastroForm.setValue({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123', confirmarSenha: 'diferente' });
    component.cadastrar();
    expect(auth.cadastrar).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('não coincidem');
  });
  it('envia uma vez e segue para onboarding somente após sucesso', () => {
    component.cadastroForm.setValue({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123', confirmarSenha: 'senha123' });
    component.cadastrar();
    component.cadastrar();
    expect(auth.cadastrar).toHaveBeenCalledOnceWith({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' });
    expect(navigate).not.toHaveBeenCalled();
    response.next('/setup/course-selection');
    response.complete();
    expect(navigate).toHaveBeenCalledOnceWith('/setup/course-selection');
    expect(component.loading).toBeFalse();
  });
  it('mantém o cadastro na tela quando a API falha', () => {
    component.cadastroForm.setValue({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123', confirmarSenha: 'senha123' });
    component.cadastrar();
    response.error(new Error('indisponível'));
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toContain('Não foi possível');
    expect(navigate).not.toHaveBeenCalled();
  });
});
