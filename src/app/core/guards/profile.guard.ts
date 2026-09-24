import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SessionService, obterTokenSessao } from '../services/session.service';
import { ProfileSetupService } from '../../features/profile-setup/services/profile-setup.service';

export const profileGuard: CanActivateChildFn = (_route, state) => {
    const router = inject(Router);
    const setup = inject(ProfileSetupService);
    const session = inject(SessionService);
    if (!obterTokenSessao()) {
        setup.limpar();
        return router.parseUrl('/login');
    }
    return setup.garantirPerfil().pipe(
        map(() => {
            const path = state.url.split('?')[0];
            const course = '/setup/course-selection';
            const period = '/setup/period-selection';
            const disciplines = '/setup/discipline-selection';
            if (!path.startsWith('/setup/')) {
                if (!setup.returningUser()) return router.parseUrl(course);
                return setup.periodoConfirmado() ? true : router.parseUrl(period);
            }
            if (setup.returningUser() && path === course) return router.parseUrl(period);
            if (path !== course && !setup.selectedCourseId()) return router.parseUrl(course);
            if (path === disciplines && !setup.selectedPeriod()) return router.parseUrl(period);
            if (path === disciplines && setup.returningUser() && !setup.periodoConfirmado()) {
                return router.parseUrl(period);
            }
            return true;
        }),
        catchError((error: unknown) => {
            setup.limpar();
            session.limpar();
            const motivo = error instanceof HttpErrorResponse && error.status === 401
                ? 'sessao-expirada' : 'perfil-indisponivel';
            return of(router.createUrlTree(['/login'], { queryParams: { motivo } }));
        }),
    );
};
