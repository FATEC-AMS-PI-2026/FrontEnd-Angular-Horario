import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RecuperarSenhaResponse {
  message: string;
}

/**
 * Resposta da API de autenticação. Cobre a issue "WEB: Formulário de Login"
 * (#93): o token retornado autentica as próximas chamadas do usuário.
 */
export interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  /**
   * Autentica o usuário com e-mail/matrícula e senha. Cobre o critério de
   * aceite "Ação de Autenticação: Envio das credenciais via API e
   * direcionamento em caso de sucesso" da issue #93.
   */
  login(identificador: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, {
      identificador,
      senha
    });
  }

  recuperarSenha(email: string): Observable<RecuperarSenhaResponse> {
    return this.http.post<RecuperarSenhaResponse>(`${this.baseUrl}/recuperar-senha`, {
      email
    });
  }
}
