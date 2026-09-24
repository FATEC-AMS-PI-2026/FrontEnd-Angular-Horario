import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
            providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
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
        expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Enviando');
        expect(fixture.nativeElement.querySelector('input').readOnly).toBeTrue();
        resposta.next({ message: 'Solicitação recebida.' });
        resposta.complete();
        fixture.detectChanges();
        expect(component.loading).toBeFalse();
        expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Solicitação recebida');
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
