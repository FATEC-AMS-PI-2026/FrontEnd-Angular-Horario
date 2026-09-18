import { obterTokenSessao } from '../../../core/services/session.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';
import { Course } from '../models/course.model';
import { CursoDetalhes, Disciplina, PerfilResponse } from '../models/profile.model';

/** Adaptador HTTP do perfil: rotas e formatos abaixo são propostas legadas do frontend,
 * não contratos confirmados do Java. Substituir aqui ao integrar o backend.
 * A conexão permanece desativada pelo backendInterceptor até essa integração.
 */
@Injectable({ providedIn: 'root' })
export class PerfilRemotoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BACKEND_CONFIG).url.replace(/\/+$/, '');

  carregar(token: string): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(`${this.baseUrl}/usuarios/me/perfil`, this.options(token));
  }

  cursos(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.baseUrl}/cursos`, this.options());
  }

  curso(id: string | null): Observable<CursoDetalhes> {
    return this.http.get<CursoDetalhes>(`${this.baseUrl}/cursos/${encodeURIComponent(id ?? '')}`, this.options());
  }

  disciplinas(cursoId: string | null): Observable<Disciplina[]> {
    return this.http.get<Disciplina[]>(`${this.baseUrl}/cursos/${encodeURIComponent(cursoId ?? '')}/disciplinas`, this.options());
  }

  confirmarPeriodo(periodo: string | null): Observable<PerfilResponse> {
    return this.http.patch<PerfilResponse>(`${this.baseUrl}/usuarios/me/perfil/periodo`, { periodo }, this.options());
  }

  salvar(cursoId: string | null, periodo: string | null, disciplinasIds: string[]): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(`${this.baseUrl}/usuarios/me/perfil`, {
      cursoId, periodo, disciplinasIds,
    }, this.options());
  }

  private options(token = obterTokenSessao() ?? ''): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }
}
