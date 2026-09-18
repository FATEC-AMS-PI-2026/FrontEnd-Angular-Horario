import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, defer, map, switchMap, tap, throwError } from 'rxjs';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { SessionService, obterTokenSessao } from '../../../core/services/session.service';
import { ProfileSetupService } from '../../profile-setup/services/profile-setup.service';
// TEMPORÁRIO: excluir estas importações de contas e modelos locais após integrar o backend Java.
import { ContaLocalService } from './conta-local.service';
import { DadosLocaisError, PerfilLocal } from '../../dados-locais/models/catalogo-local';

export interface RecuperarSenhaResponse { message: string; }
export interface LoginResponse { token: string; }
export interface CadastroPayload { nome: string; email: string; senha: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly session = inject(SessionService);
    private readonly setup = inject(ProfileSetupService);
    private readonly http = inject(HttpClient);
    // TEMPORÁRIO: excluir esta dependência de contas locais após integrar o backend Java.
    private readonly contas = inject(ContaLocalService);
    private readonly config = inject(BACKEND_CONFIG);
    // TEMPORÁRIO: excluir este indicador de armazenamento local após integrar o backend Java.
    get modoLocal(): boolean { return !this.config.habilitado; }
    // Contrato legado do frontend: alinhar email/accessToken/refreshToken com o Java antes de habilitar.
    private readonly baseUrl = `${inject(BACKEND_CONFIG).url.replace(/\/+$/, '')}/auth`;

    login(identificador: string, senha: string, lembrarDeMim = true): Observable<string> {
        // TEMPORÁRIO: excluir este login local após integrar o backend Java.
        if (this.modoLocal) return this.abrirLocal(() => this.contas.entrar(identificador, senha), lembrarDeMim);
        return this.autenticar('login', { identificador, senha }, false, lembrarDeMim);
    }

    cadastrar(payload: CadastroPayload): Observable<string> {
        // TEMPORÁRIO: excluir este cadastro local após integrar o backend Java.
        if (this.modoLocal) return this.abrirLocal(() => this.contas.cadastrar(payload.nome, payload.email, payload.senha));
        return this.autenticar('cadastro', payload, true);
    }

    // TEMPORÁRIO: excluir este método inteiro de sessão local após integrar o backend Java.
    private abrirLocal(operacao: () => Promise<{ perfil: PerfilLocal; email: string }>, lembrarDeMim = true): Observable<string> {
        return defer(() => {
            this.setup.limpar(); this.session.limpar();
            return operacao();
        }).pipe(switchMap(({ perfil, email }) => {
            this.session.iniciar('gini-local:' + perfil.id, { nome: perfil.nome, email, curso: '', periodo: '' }, lembrarDeMim);
            return this.setup.carregarPerfil();
        }), map(() => this.setup.destinoAposLogin()), catchError((erro: unknown) => {
            this.setup.limpar(); this.session.limpar();
            return throwError(() => erro);
        }));
    }

    recuperarSenha(email: string): Observable<RecuperarSenhaResponse> {
        // TEMPORÁRIO: excluir esta restrição das contas locais após integrar o backend Java.
        if (this.modoLocal) return throwError(() => new DadosLocaisError(
            'Contas deste navegador ainda não possuem recuperação por e-mail. Essa função estará disponível com o backend.',
        ));
        return this.http.post<RecuperarSenhaResponse>(`${this.baseUrl}/recuperar-senha`, { email });
    }

    logout(): void {
        this.setup.limpar();
        this.session.logout();
    }

    isLoggedIn(): boolean {
        return !!obterTokenSessao();
    }

    private autenticar(endpoint: string, payload: CadastroPayload | { identificador: string; senha: string }, novo = false, lembrarDeMim = true): Observable<string> {
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
                    this.session.iniciar(token, perfil.usuario, lembrarDeMim);
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
