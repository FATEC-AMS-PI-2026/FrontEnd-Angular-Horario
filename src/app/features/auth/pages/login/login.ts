import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

/**
 * Tela de login. Cobre os critérios de aceite da issue "WEB: Formulário de
 * Login" (#93):
 * - Validação de campos obrigatórios (E-mail/Matrícula e Senha);
 * - Envio das credenciais via API, com redirecionamento em caso de sucesso;
 * - Link "Esqueci minha senha" navegando direto para a tela de recuperação
 *   (rota `/esqueci-senha`, já implementada pela issue #98).
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  form: FormGroup;
  submitted = false;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
  ) {
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
