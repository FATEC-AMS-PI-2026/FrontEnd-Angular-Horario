import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-cadastro',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './cadastro.html',
    styleUrl: './cadastro.scss',
})
export class Cadastro {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly cadastroForm = inject(FormBuilder).nonNullable.group({
        nome: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/\S/)]],
        email: ['', [Validators.required, Validators.email]],
        senha: ['', [Validators.required, Validators.minLength(8)]],
        confirmarSenha: ['', Validators.required],
    });
    loading = false;
    errorMessage = '';

    cadastrar(): void {
        if (this.loading) return;
        this.errorMessage = '';
        if (this.cadastroForm.invalid) {
            this.cadastroForm.markAllAsTouched();
            return;
        }
        const { nome, email, senha, confirmarSenha } = this.cadastroForm.getRawValue();
        if (senha !== confirmarSenha) {
            this.errorMessage = 'As senhas não coincidem.';
            return;
        }
        this.loading = true;
        this.auth.cadastrar({ nome: nome.trim(), email: email.trim(), senha }).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading = false),
        ).subscribe({
            next: destino => { void this.router.navigateByUrl(destino); },
            error: () => {
                this.errorMessage = 'Não foi possível concluir o cadastro ou consultar seu perfil. Se a conta já foi criada, entre pela tela de login.';
            },
        });
    }
}
