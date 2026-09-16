import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, defer, map, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/services/session.service';
import { ProfileSetupService } from '../../profile-setup/services/profile-setup.service';
// TEMPORÁRIO: excluir esta importação após integrar o backend.
import { DemoAuthService } from './demo-auth.service';

export interface RecuperarSenhaResponse { message: string; }
export interface LoginResponse { token: string; }
export interface CadastroPayload { nome: string; email: string; senha: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
    // TEMPORÁRIO: excluir esta dependência após integrar o backend.
    private readonly demoAuth = inject(DemoAuthService);
    private readonly session = inject(SessionService);
    private readonly setup = inject(ProfileSetupService);
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/auth`;

    login(identificador: string, senha: string): Observable<string> {
        // TEMPORÁRIO: excluir este desvio após integrar o backend e usar somente autenticar().
        if (this.demoAuth.habilitado) {
            return this.demoAuth.login(identificador, senha);
        }
        return this.autenticar('login', { identificador, senha });
    }

    cadastrar(payload: CadastroPayload): Observable<string> {
        return this.autenticar('cadastro', payload, true);
    }

    recuperarSenha(email: string): Observable<RecuperarSenhaResponse> {
        return this.http.post<RecuperarSenhaResponse>(`${this.baseUrl}/recuperar-senha`, { email });
    }

    logout(): void {
        this.setup.limpar();
        this.session.logout();
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('gini_token');
    }

    private autenticar(endpoint: string, payload: CadastroPayload | { identificador: string; senha: string }, novo = false): Observable<string> {
        return defer(() => {
            this.setup.limpar();
            this.session.limpar();
            return this.http.post<LoginResponse>(`${this.baseUrl}/${endpoint}`, payload);
        }).pipe(
            switchMap(({ token }) => {
                if (typeof token !== 'string' || !token.trim()) {
                    return throwError(() => new Error('Token de autenticação inválido.'));
                }
                return this.setup.carregarPerfil(token).pipe(tap(perfil => {
                    if (novo && perfil.configuracaoInicialConcluida) {
                        throw new Error('Estado de cadastro inválido.');
                    }
                    this.session.iniciar(token, perfil.usuario);
                }));
            }),
            map(() => this.setup.destinoAposLogin()),
            catchError((error: unknown) => {
                this.setup.limpar();
                this.session.limpar();
                return throwError(() => error);
            }),
        );
    }
}
