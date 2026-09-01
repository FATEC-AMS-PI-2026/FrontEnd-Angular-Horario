import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

  constructor(private router: Router) { }

  onLogin(event: Event) {
    // Evitar o recarregamento padrão da página ao enviar o formulário
    event.preventDefault();

    // TODO: Futuramente, fazer a chamada HTTP para validar o usuário no backend.
    // Por enquanto, redireciona o usuário direto para o fluxo de escolha de curso (setup).
    this.router.navigate(['/setup']);
  }
}