import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { obterTokenSessao } from '../services/session.service';
import { ProfileSetupService } from '../../features/profile-setup/services/profile-setup.service';

/**
 * Rotas só de visitante: login, cadastro e recuperação de senha (#158).
 * Com sessão válida (restaurada do LocalStorage/SessionStorage, #130), o usuário vai
 * direto ao destino que o perfil pede: onboarding incompleto → curso; novo período
 * letivo → período; senão Início (#148). A sessão nunca é limpa aqui, então abrir
 * /cadastro logado não inicia outra conta. Se o perfil não puder ser lido, manda ao
 * Início e deixa o profileGuard decidir (ele limpa a sessão recusada e volta ao login).
 */
export const guestGuard: CanActivateFn = () => {
  if (!obterTokenSessao()) return true;

  const router = inject(Router);
  const setup = inject(ProfileSetupService);
  return setup.garantirPerfil().pipe(
    map(() => router.parseUrl(setup.destinoAposLogin())),
    catchError(() => of(router.parseUrl('/dashboard'))),
  );
};
