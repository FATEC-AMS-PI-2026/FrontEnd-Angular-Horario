import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { obterTokenSessao } from '../../core/services/session.service';

/**
 * Página para URLs inexistentes (#158). Substitui o antigo redirecionamento silencioso
 * de toda rota desconhecida para o login. O retorno depende da sessão: logado vai ao
 * Início (o profileGuard ainda leva ao onboarding se o perfil pedir); visitante, ao login.
 */
@Component({
  selector: 'app-nao-encontrada',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nao-encontrada.html',
  styleUrl: './nao-encontrada.scss',
})
export class NaoEncontrada {
  readonly endereco = inject(Router).url;
  readonly autenticado = !!obterTokenSessao();
  readonly destino = this.autenticado ? '/dashboard' : '/login';
  readonly rotuloDestino = this.autenticado ? 'Voltar ao início' : 'Ir para o login';
}
