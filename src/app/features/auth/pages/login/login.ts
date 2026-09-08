import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  // Injeção de dependências moderna (padrão Angular 17+)
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  form: FormGroup;
  submitted = false;
  loading = false;
  errorMessage = '';

  constructor() {
    this.form = this.fb.group({
      identificador: ['', [Validators.required]],
      senha: ['', [Validators.required]],
    });
  }

  get identificador() {
    return this.form.get('identificador');
  }

  get senha() {
    return this.form.get('senha');
  }

  onLogin(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      return;
    }

    this.loading = true;

    this.authService.login(this.identificador?.value, this.senha?.value).subscribe({
      next: () => {
        this.loading = false;
        // Direciona o usuário para o fluxo de escolha de curso (setup) após autenticar.
        this.router.navigate(['/setup']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'E-mail/matrícula ou senha inválidos. Tente novamente.';
      },
    });
  }
}