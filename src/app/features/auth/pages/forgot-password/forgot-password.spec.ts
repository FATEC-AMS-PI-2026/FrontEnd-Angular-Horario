import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { ForgotPassword } from './forgot-password';
import { AuthService, RecuperarSenhaResponse } from '../../services/auth.service';

describe('ForgotPassword: estados da solicitação', () => {
  function preparar() {
    const resposta = new Subject<RecuperarSenhaResponse>();
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['recuperarSenha']);
    auth.recuperarSenha.and.returnValue(resposta);
    TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.componentInstance.form.setValue({ email: 'ana@example.test' });
    return { fixture, component: fixture.componentInstance, auth, resposta };
  }

  it('bloqueia duplicação, anuncia carregamento e depois sucesso', () => {
    const { component, fixture, auth, resposta } = preparar();
    component.onSubmit();
    component.onSubmit();
    fixture.detectChanges();
    expect(auth.recuperarSenha).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Enviando',
    );
    expect(fixture.nativeElement.querySelector('input').readOnly).toBeTrue();
    resposta.next({ message: 'Solicitação recebida.' });
    resposta.complete();
    fixture.detectChanges();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Solicitação recebida',
    );
  });

  it('mantém o e-mail após falha e permite tentar novamente', () => {
    const { component, auth, resposta } = preparar();
    component.onSubmit();
    resposta.error(new HttpErrorResponse({ status: 422, error: { errors: ['E-mail inválido.'] } }));
    expect(component.errorMessage).toBe('E-mail inválido.');
    expect(component.form.getRawValue().email).toBe('ana@example.test');
    expect(component.loading).toBeFalse();
    auth.recuperarSenha.and.returnValue(new Subject<RecuperarSenhaResponse>());
    component.onSubmit();
    expect(auth.recuperarSenha).toHaveBeenCalledTimes(2);
    expect(component.errorMessage).toBe('');
  });

  it('cancela a observação ao sair da tela', () => {
    const { fixture, component, resposta } = preparar();
    component.onSubmit();
    fixture.destroy();
    resposta.next({ message: 'Resposta atrasada' });
    expect(component.successMessage).toBe('');
    expect(component.loading).toBeFalse();
  });
});

describe('ForgotPassword: troca de senha autenticada (#158)', () => {
  afterEach(() => {
    localStorage.removeItem('gini_token');
    localStorage.removeItem('gini_usuario');
  });

  it('usa o e-mail da sessão, sem edição, e volta às Configurações', () => {
    localStorage.setItem('gini_token', 'token');
    localStorage.setItem(
      'gini_usuario',
      JSON.stringify({ nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: '', periodo: '' }),
    );
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['recuperarSenha']);
    auth.recuperarSenha.and.returnValue(new Subject<RecuperarSenhaResponse>());
    TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { alteracaoAutenticada: true } } },
        },
      ],
    });
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('Alterar senha');
    expect(element.querySelector('input')!.readOnly).toBeTrue();
    expect(element.querySelector('a.btn-outline')!.getAttribute('href')).toBe('/configuracoes');
    fixture.componentInstance.onSubmit();
    expect(auth.recuperarSenha).toHaveBeenCalledWith('ana@cps.sp.gov.br');
  });
});
