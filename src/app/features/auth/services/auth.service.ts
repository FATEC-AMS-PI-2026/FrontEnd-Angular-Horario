import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
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

  constructor(private http: HttpClient) { }

  // Quando o Spring Boot estiver pronto, trocar isso por um this.http.post(...)
  login(identificador: string, senha: string): Observable<boolean> {

    // Credenciais de teste:
    const mockEmail = 'aluno@cps.sp.gov.br';
    const mockSenha = '123';

    if (identificador === mockEmail && senha === mockSenha) {
      // Simula o salvamento do Token JWT no navegador
      localStorage.setItem('gini_token', 'token_falso_gerado_pelo_angular');

      // Retorna sucesso após 1 segundo (simulando a lentidão da internet)
      return of(true).pipe(delay(1000));
    } else {
      // Retorna erro se a senha estiver errada
      return throwError(() => new Error('Credenciais inválidas')).pipe(delay(1000));
    }
  }

  recuperarSenha(email: string): Observable<RecuperarSenhaResponse> {
    return this.http.post<RecuperarSenhaResponse>(`${this.baseUrl}/recuperar-senha`, {
      email
    });
  }

  logout() {
    localStorage.removeItem('gini_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('gini_token');
  }
}
