import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * Impede acesso à tela de login quando já existe uma sessão válida (restaurada
 * do LocalStorage/SessionStorage pelo SessionService), redirecionando direto
 * pra escolha de semestre. Cobre o critério "Autenticação Automática" da
 * issue "WEB: Auth - Funcionalidade 'Lembrar de mim' no Login" (#130).
 */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.usuario()) {
    return router.createUrlTree(['/setup']);
  }

  return true;
};
