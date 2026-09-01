import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RecuperarSenhaResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  recuperarSenha(email: string): Observable<RecuperarSenhaResponse> {
    return this.http.post<RecuperarSenhaResponse>(`${this.baseUrl}/recuperar-senha`, {
      email
    });
  }
}