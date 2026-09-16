import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ApiErrorService } from '../../../../core/services/api-error.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './forgot-password.html',
    styleUrls: ['./forgot-password.scss']
})
export class ForgotPassword {
    private readonly destroyRef = inject(DestroyRef);
    private readonly apiError = inject(ApiErrorService);
    form: FormGroup;
    submitted = false;
    loading = false;
    successMessage = '';
    errorMessage = '';

    constructor(private fb: FormBuilder, private authService: AuthService) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    get email() {
        return this.form.get('email');
    }

    onSubmit(): void {
        if (this.loading) return;
        this.submitted = true;
        this.successMessage = '';
        this.errorMessage = '';

        if (this.form.invalid) {
            return;
        }

        this.loading = true;

        this.authService.recuperarSenha(this.email?.value.trim()).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading = false),
        ).subscribe({
            next: (res) => {
                this.loading = false;
                this.successMessage =
                    typeof res?.message === 'string' && res.message.trim()
                        ? res.message : 'Se o e-mail informado estiver cadastrado, você receberá um link de redefinição em instantes.';
            },
            error: (error: unknown) => {
                this.loading = false;
                this.errorMessage = this.apiError.mensagem(error,
                    'Não foi possível enviar o e-mail de recuperação. Tente novamente.');
            }
        });
    }
}
