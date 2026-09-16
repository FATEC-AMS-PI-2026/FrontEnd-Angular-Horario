import { Component, DestroyRef, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
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
    private readonly destroyRef = inject(DestroyRef);
    readonly form = inject(FormBuilder).nonNullable.group({
        identificador: ['', [Validators.required, Validators.pattern(/\S/)]],
        senha: ['', Validators.required],
    });
    submitted = false;
    loading = false;
    errorMessage = '';

    get identificador() { return this.form.controls.identificador; }
    get senha() { return this.form.controls.senha; }

    onLogin(): void {
        if (this.loading) return;
        this.submitted = true;
        this.errorMessage = '';
        if (this.form.invalid) return;
        this.loading = true;
        this.authService.login(this.identificador.value.trim(), this.senha.value).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading = false),
        ).subscribe({
            next: destino => { void this.router.navigateByUrl(destino); },
            error: (error: unknown) => {
                this.errorMessage = error instanceof HttpErrorResponse && error.status === 401
                    ? 'E-mail/matrícula ou senha inválidos. Tente novamente.'
                    : 'Não foi possível entrar ou consultar seu perfil. Tente novamente.';
            },
        });
    }
}
