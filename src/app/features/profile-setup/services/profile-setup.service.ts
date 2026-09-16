import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap, throwError } from 'rxjs';
// TEMPORÁRIO: excluir estas importações após integrar o backend.
import { defer } from 'rxjs';
import { DemoProfileService } from './demo-profile.service';
import { SessionService } from '../../../core/services/session.service';
import { environment } from '../../../../environments/environment';
import { Course } from '../models/course.model';
import { CursoDetalhes, Disciplina, PerfilResponse } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileSetupService {
    // TEMPORÁRIO: excluir a dependência e o indicador de demonstração após integrar o backend.
    private readonly demo = inject(DemoProfileService);
    get modoDemonstracao(): boolean { return this.demo.ativo; }
    private readonly http = inject(HttpClient);
    private readonly session = inject(SessionService);
    private readonly baseUrl = environment.apiUrl;
    private loadedToken: string | null = null;
    private readonly perfilAtual = signal<PerfilResponse | null>(null);
    readonly perfil = this.perfilAtual.asReadonly();
    readonly returningUser = computed(() => this.perfil()?.configuracaoInicialConcluida === true);
    readonly currentStep = signal(2);
    readonly periodoConfirmado = signal(false);
    readonly selectedCourseId = signal<string | null>(null);
    readonly selectedCourse = signal<string | null>(null);
    readonly selectedPeriod = signal<string | null>(null);
    readonly selectedDisciplinas = signal<string[]>([]);
    readonly isSetupComplete = computed(() => !!this.selectedCourseId() && !!this.selectedPeriod());

    carregarPerfil(token = localStorage.getItem('gini_token')): Observable<PerfilResponse> {
        // TEMPORÁRIO: excluir este carregamento local após integrar o backend.
        if (this.demo.ativo) {
            return defer(() => {
                const estado = this.demo.restaurar();
                const perfil = estado.perfil;
                this.loadedToken = token;
                this.perfilAtual.set(perfil);
                this.selectedCourseId.set(perfil.cursoId);
                this.selectedCourse.set(perfil.usuario.curso || null);
                this.selectedPeriod.set(perfil.usuario.periodo || null);
                this.selectedDisciplinas.set([]);
                this.periodoConfirmado.set(estado.periodoConfirmado);
                this.currentStep.set(this.returningUser() ? 3 : 2);
                return of(perfil);
            });
        }
        if (!token) return throwError(() => new Error('Sessão não autenticada.'));
        return this.http.get<PerfilResponse>(`${this.baseUrl}/usuarios/me/perfil`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }).pipe(tap(perfil => {
            if (typeof perfil.configuracaoInicialConcluida !== 'boolean' || !perfil.usuario ||
                !Array.isArray(perfil.disciplinasIds) ||
                (perfil.configuracaoInicialConcluida && !perfil.cursoId)) {
                throw new Error('Perfil retornado pela API é inválido.');
            }
            this.loadedToken = token;
            this.periodoConfirmado.set(false);
            this.perfilAtual.set(perfil);
            this.selectedCourseId.set(perfil.cursoId);
            this.selectedCourse.set(perfil.usuario.curso || null);
            this.selectedPeriod.set(perfil.usuario.periodo || null);
            this.selectedDisciplinas.set([...perfil.disciplinasIds]);
            this.currentStep.set(this.returningUser() ? 3 : 2);
        }));
    }

    garantirPerfil(): Observable<PerfilResponse> {
        const token = localStorage.getItem('gini_token');
        const perfil = this.perfil();
        return token && token === this.loadedToken && perfil ? of(perfil) : this.carregarPerfil(token);
    }

    destinoAposLogin(): string {
        return this.returningUser() ? '/setup/period-selection' : '/setup/course-selection';
    }

    listarCursos(): Observable<Course[]> {
        // TEMPORÁRIO: excluir o catálogo demonstrativo após integrar o backend.
        if (this.demo.ativo) return of(structuredClone(this.demo.cursos));
        return this.http.get<Course[]>(`${this.baseUrl}/cursos`, this.options());
    }

    obterCurso(): Observable<CursoDetalhes> {
        // TEMPORÁRIO: excluir a consulta demonstrativa após integrar o backend.
        if (this.demo.ativo) {
            const curso = this.demo.cursos.find(item => item.id === this.selectedCourseId());
            return curso ? of(structuredClone(curso)) : throwError(() => new Error('Curso indisponível.'));
        }
        return this.http.get<CursoDetalhes>(
            `${this.baseUrl}/cursos/${encodeURIComponent(this.selectedCourseId() ?? '')}`, this.options());
    }

    listarDisciplinas(): Observable<Disciplina[]> {
        return this.http.get<Disciplina[]>(`${this.baseUrl}/cursos/${encodeURIComponent(this.selectedCourseId() ?? '')}/disciplinas`, {
            ...this.options(), params: { periodo: this.selectedPeriod() ?? '' },
        });
    }

    setCourse(curso: string, id: string): void {
        if (id !== this.selectedCourseId()) {
            this.selectedPeriod.set(null);
            this.selectedDisciplinas.set([]);
        }
        this.selectedCourseId.set(id);
        this.selectedCourse.set(curso);
        this.currentStep.set(3);
        // TEMPORÁRIO: excluir a persistência das escolhas demo após integrar o backend.
        if (this.demo.ativo) this.demo.escolher(id, this.selectedPeriod());
    }

    setPeriod(periodo: string): void {
        if (periodo !== this.selectedPeriod() && !this.returningUser()) {
            this.selectedDisciplinas.set([]);
        }
        this.selectedPeriod.set(periodo);
        // TEMPORÁRIO: excluir a persistência das escolhas demo após integrar o backend.
        if (this.demo.ativo) this.demo.escolher(this.selectedCourseId(), periodo);
    }

    goBack(): void {
        this.currentStep.set(2);
    }

    confirmarPeriodo(): Observable<PerfilResponse> {
        // TEMPORÁRIO: excluir a conclusão demo sem disciplinas após integrar o backend.
        if (this.demo.ativo) {
            return defer(() => {
                const perfil = this.demo.confirmar(this.selectedCourseId(), this.selectedPeriod());
                this.atualizarPerfil(perfil);
                this.periodoConfirmado.set(true);
                return of(perfil);
            });
        }
        if (!this.returningUser() || !this.isSetupComplete()) {
            return throwError(() => new Error('Perfil ou período inválido.'));
        }
        return this.http.patch<PerfilResponse>(`${this.baseUrl}/usuarios/me/perfil/periodo`, {
            periodo: this.selectedPeriod(),
        }, this.options()).pipe(tap(perfil => {
            if (perfil.configuracaoInicialConcluida !== true) {
                throw new Error('Perfil não configurado.');
            }
            this.atualizarPerfil(perfil);
            this.periodoConfirmado.set(true);
        }));
    }

    submitProfile(): Observable<PerfilResponse> {
        if (!this.isSetupComplete() || !this.selectedDisciplinas().length) {
            return throwError(() => new Error('Conclua a seleção de disciplinas.'));
        }
        return this.http.put<PerfilResponse>(`${this.baseUrl}/usuarios/me/perfil`, {
            cursoId: this.selectedCourseId(), periodo: this.selectedPeriod(),
            disciplinasIds: this.selectedDisciplinas(),
        }, this.options()).pipe(tap(perfil => {
            if (perfil.configuracaoInicialConcluida !== true) {
                throw new Error('A configuração do perfil não foi concluída.');
            }
            this.atualizarPerfil(perfil);
            this.periodoConfirmado.set(true);
        }));
    }

    limpar(): void {
        this.loadedToken = null;
        this.periodoConfirmado.set(false);
        this.perfilAtual.set(null);
        this.selectedCourseId.set(null);
        this.selectedCourse.set(null);
        this.selectedPeriod.set(null);
        this.selectedDisciplinas.set([]);
        this.currentStep.set(2);
    }

    private atualizarPerfil(perfil: PerfilResponse): void {
        this.perfilAtual.set(perfil);
        this.session.atualizarPerfil(perfil.usuario.curso, perfil.usuario.periodo);
    }

    private options(): { headers: HttpHeaders } {
        return { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('gini_token') ?? ''}` }) };
    }
}
