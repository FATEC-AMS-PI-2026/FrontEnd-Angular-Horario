import { Component, DestroyRef, inject } from '@angular/core';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    // TEMPORÁRIO: excluir este indicador de conta local após integrar o backend Java.
    readonly modoLocal = this.authService.modoLocal;
    private readonly apiError = inject(ApiErrorService);
    private readonly destroyRef = inject(DestroyRef);
    readonly form = inject(FormBuilder).nonNullable.group({
        identificador: ['', [Validators.required, Validators.pattern(/\S/)]],
        senha: ['', Validators.required],
        lembrarDeMim: [false],
    });
    submitted = false;
    loading = false;
    errorMessage = this.mensagemInicial();

    private mensagemInicial(): string {
        const motivo = inject(ActivatedRoute).snapshot.queryParamMap.get('motivo');
        return motivo === 'sessao-expirada' ? 'Sua sessão expirou. Entre novamente para continuar.'
            : motivo === 'perfil-indisponivel' ? 'Não foi possível carregar seu perfil. Tente entrar novamente.' : '';
    }

    get identificador() { return this.form.controls.identificador; }
    get senha() { return this.form.controls.senha; }

    onLogin(): void {
        if (this.loading) return;
        this.submitted = true;
        this.errorMessage = '';
        if (this.form.invalid) return;
        this.loading = true;
        this.authService.login(this.identificador.value.trim(), this.senha.value, this.form.controls.lembrarDeMim.value).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading = false),
        ).subscribe({
            next: destino => { void this.router.navigateByUrl(destino); },
            error: (error: unknown) => {
                this.errorMessage = this.apiError.mensagem(error,
                    'Não foi possível entrar ou consultar seu perfil. Tente novamente.', true);
            },
        });
    }
}
