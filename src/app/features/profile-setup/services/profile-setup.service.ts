import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, defer, of, tap, throwError } from 'rxjs';
// TEMPORÁRIO: excluir estas importações após integrar o backend.
import { DemoProfileService } from './demo-profile.service';
import { SessionService, obterTokenSessao } from '../../../core/services/session.service';
import { PerfilRemotoService } from './perfil-remoto.service';
import { Course } from '../models/course.model';
import { CursoDetalhes, Disciplina, PerfilResponse } from '../models/profile.model';
// TEMPORÁRIO: excluir esta importação de armazenamento local após integrar o backend Java.
import { DadosLocaisService } from '../../dados-locais/services/dados-locais.service';

@Injectable({ providedIn: 'root' })
export class ProfileSetupService {
    // TEMPORÁRIO: excluir esta dependência local após integrar o backend Java.
    private readonly local = inject(DadosLocaisService);
    // TEMPORÁRIO: excluir a dependência e o indicador de demonstração após integrar o backend.
    private readonly demo = inject(DemoProfileService);
    get modoDemonstracao(): boolean { return this.demo.ativo; }
    private readonly remoto = inject(PerfilRemotoService);
    private readonly session = inject(SessionService);
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

    carregarPerfil(token = obterTokenSessao()): Observable<PerfilResponse> {
        // TEMPORÁRIO: excluir este desvio para o armazenamento local após integrar o backend Java.
        if (this.local.ativo) {
            return defer(() => this.local.carregarPerfil()).pipe(tap(perfil => {
                if (this.loadedToken !== token || !perfil.configuracaoInicialConcluida) this.periodoConfirmado.set(false);
                this.loadedToken = token;
                this.perfilAtual.set(perfil);
                this.selectedCourseId.set(perfil.cursoId);
                this.selectedCourse.set(perfil.usuario.curso || null);
                this.selectedPeriod.set(perfil.usuario.periodo || null);
                this.selectedDisciplinas.set(perfil.disciplinasIds);
                this.session.atualizarPerfil(perfil.usuario.curso, perfil.usuario.periodo);
            }));
        }
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
                this.selectedDisciplinas.set(estado.disciplinasRascunho ?? perfil.disciplinasIds);
                this.periodoConfirmado.set(estado.periodoConfirmado);
                this.currentStep.set(this.returningUser() ? 3 : 2);
                return of(perfil);
            });
        }
        if (!token) return throwError(() => new Error('Sessão não autenticada.'));
        return this.remoto.carregar(token).pipe(tap(perfil => {
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
        const token = obterTokenSessao();
        const perfil = this.perfil();
        return token && token === this.loadedToken && perfil ? of(perfil) : this.carregarPerfil(token);
    }

    destinoAposLogin(): string {
        return this.returningUser() ? '/setup/period-selection' : '/setup/course-selection';
    }

    listarCursos(): Observable<Course[]> {
        // TEMPORÁRIO: excluir este desvio para o armazenamento local após integrar o backend Java.
        if (this.local.ativo) return defer(() => this.local.cursos());
        // TEMPORÁRIO: excluir o catálogo demonstrativo após integrar o backend.
        if (this.demo.ativo) return of(structuredClone(this.demo.cursos));
        return this.remoto.cursos();
    }

    obterCurso(): Observable<CursoDetalhes> {
        // TEMPORÁRIO: excluir este desvio para o armazenamento local após integrar o backend Java.
        if (this.local.ativo) return defer(() => this.local.curso(this.selectedCourseId()));
        // TEMPORÁRIO: excluir a consulta demonstrativa após integrar o backend.
        if (this.demo.ativo) {
            const curso = this.demo.cursos.find(item => item.id === this.selectedCourseId());
            return curso ? of(structuredClone(curso)) : throwError(() => new Error('Curso indisponível.'));
        }
        return this.remoto.curso(this.selectedCourseId());
    }

    listarDisciplinas(): Observable<Disciplina[]> {
        // TEMPORÁRIO: excluir este desvio para o armazenamento local após integrar o backend Java.
        if (this.local.ativo) return defer(() => this.local.disciplinas(this.selectedCourseId()));
        // TEMPORÁRIO: excluir o catálogo demonstrativo após integrar o backend.
        if (this.demo.ativo) return of(this.demo.listarDisciplinas(this.selectedCourseId()));
        // A matriz completa mantém DPs e adiantamentos disponíveis, independentemente do filtro da tela.
        return this.remoto.disciplinas(this.selectedCourseId());
    }

    definirDisciplinas(ids: string[]): void {
        this.selectedDisciplinas.set([...new Set(ids)]);
        // TEMPORÁRIO: excluir a persistência do rascunho demo após integrar o backend.
        if (this.demo.ativo) this.demo.guardarDisciplinas(this.selectedDisciplinas());
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
        // A seleção pode incluir outros períodos; mudar o período atual não descarta DPs/adiantamentos.
        this.selectedPeriod.set(periodo);
        // TEMPORÁRIO: excluir a persistência das escolhas demo após integrar o backend.
        if (this.demo.ativo) this.demo.escolher(this.selectedCourseId(), periodo);
    }

    goBack(): void {
        this.currentStep.set(2);
    }

    confirmarPeriodo(): Observable<PerfilResponse> {
        if (!this.returningUser() || !this.isSetupComplete()) {
            return throwError(() => new Error('Perfil ou período inválido.'));
        }
        // TEMPORÁRIO: excluir este desvio para o armazenamento local após integrar o backend Java.
        if (this.local.ativo) return this.salvarLocal(true);
        // TEMPORÁRIO: excluir a confirmação local de reentrada após integrar o backend.
        if (this.demo.ativo) {
            return defer(() => {
                const perfil = this.demo.confirmar(this.selectedCourseId(), this.selectedPeriod());
                this.atualizarPerfil(perfil);
                this.periodoConfirmado.set(true);
                return of(perfil);
            });
        }
        return this.remoto.confirmarPeriodo(this.selectedPeriod()).pipe(tap(perfil => {
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
        // TEMPORÁRIO: excluir este desvio para o armazenamento local após integrar o backend Java.
        if (this.local.ativo) return this.salvarLocal(false);
        // TEMPORÁRIO: excluir a gravação da grade demonstrativa após integrar o backend.
        if (this.demo.ativo) {
            return defer(() => {
                const perfil = this.demo.concluirGrade(
                    this.selectedCourseId(), this.selectedPeriod(), this.selectedDisciplinas());
                this.atualizarPerfil(perfil);
                this.periodoConfirmado.set(true);
                return of(perfil);
            });
        }
        return this.remoto.salvar(this.selectedCourseId(), this.selectedPeriod(),
            this.selectedDisciplinas()).pipe(tap(perfil => {
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

    // TEMPORÁRIO: excluir este método de gravação local após integrar o backend Java.
    private salvarLocal(confirmar: boolean): Observable<PerfilResponse> {
        return defer(() => this.local.salvar(this.selectedCourseId(), this.selectedPeriod(),
            this.selectedDisciplinas(), confirmar)).pipe(tap(perfil => {
                this.atualizarPerfil(perfil);
                this.periodoConfirmado.set(true);
            }));
    }

    private atualizarPerfil(perfil: PerfilResponse): void {
        this.perfilAtual.set(perfil);
        this.session.atualizarPerfil(perfil.usuario.curso, perfil.usuario.periodo);
    }

}
