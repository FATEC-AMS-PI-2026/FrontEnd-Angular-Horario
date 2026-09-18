/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend.
 * Acesso demonstrativo local, sem autenticação real nem consulta de perfil.
 * Contas: primeiro@gini.local (primeiro acesso), demo@gini.local (reentrada).
 * Senha de ambas: Demo123! Cada login reinicia o cenário correspondente.
 */
import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, defer, map, throwError } from 'rxjs';
import { SessionService } from '../../../core/services/session.service';
import { ProfileSetupService } from '../../profile-setup/services/profile-setup.service';
import { DemoProfileService } from '../../profile-setup/services/demo-profile.service';

@Injectable({ providedIn: 'root' })
export class DemoAuthService {
    private readonly session = inject(SessionService);
    private readonly setup = inject(ProfileSetupService);
    private readonly demo = inject(DemoProfileService);

    get habilitado(): boolean {
        return this.demo.habilitado;
    }

    get sessaoDemonstrativa(): boolean {
        return this.demo.sessaoDemonstrativa;
    }

    login(email: string, senha: string, lembrarDeMim = true): Observable<string> {
        return defer(() => {
            this.setup.limpar();
            this.session.limpar();
            const conta = email.trim();
            if (!this.habilitado || !['primeiro@gini.local', 'demo@gini.local'].includes(conta) || senha !== 'Demo123!') {
                return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
            }
            const perfil = this.demo.iniciar(conta === 'primeiro@gini.local');
            this.session.iniciar(this.demo.token, perfil.usuario, lembrarDeMim);
            return this.setup.carregarPerfil().pipe(map(() => this.setup.destinoAposLogin()));
        });
    }
}
