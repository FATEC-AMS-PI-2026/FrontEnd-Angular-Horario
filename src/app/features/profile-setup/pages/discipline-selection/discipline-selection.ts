import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, map } from 'rxjs';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { Disciplina } from '../../models/profile.model';
import { ApiErrorService } from '../../../../core/services/api-error.service';

type TipoDisciplina = 'Regular' | 'DP' | 'Adiantamento';

@Component({
    selector: 'app-discipline-selection',
    standalone: true,
    templateUrl: './discipline-selection.html',
    styleUrl: './discipline-selection.scss',
})
export class DisciplineSelection implements OnInit {
    readonly setupService = inject(ProfileSetupService);
    private readonly router = inject(Router);
    private readonly apiError = inject(ApiErrorService);
    private readonly destroyRef = inject(DestroyRef);
    readonly disciplinas = signal<Disciplina[]>([]);
    readonly periodos = signal<string[]>([]);
    readonly filtroPeriodo = signal<string | null>(null);
    readonly busca = signal('');
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly carregado = signal(false);
    readonly errorMessage = signal('');
    readonly avisoSelecao = signal('');
    readonly disciplinasDoPeriodo = computed(() =>
        this.disciplinas().filter(item => item.periodo === this.filtroPeriodo()));
    readonly podeAdicionarTodas = computed(() =>
        this.carregado() && !this.loading() && !this.saving() &&
        this.disciplinasDoPeriodo().some(item =>
            !this.setupService.selectedDisciplinas().includes(item.id)));
    readonly selecionadas = computed(() => {
        const ids = new Set(this.setupService.selectedDisciplinas());
        return this.disciplinas().filter(disciplina => ids.has(disciplina.id));
    });
    readonly visiveis = computed(() => {
        const termo = this.normalizar(this.busca().trim());
        return this.disciplinas().filter(disciplina =>
            (!this.filtroPeriodo() || disciplina.periodo === this.filtroPeriodo()) &&
            (!termo || this.normalizar(disciplina.nome).includes(termo)));
    });
    readonly resumo = computed(() => {
        const itens = this.selecionadas();
        return {
            regular: itens.filter(item => this.tipo(item) === 'Regular').length,
            dp: itens.filter(item => this.tipo(item) === 'DP').length,
            adiantamento: itens.filter(item => this.tipo(item) === 'Adiantamento').length,
        };
    });

    ngOnInit(): void {
        this.setupService.currentStep.set(4);
        this.filtroPeriodo.set(this.setupService.selectedPeriod());
        this.carregar();
    }

    carregar(): void {
        if (this.loading() || this.saving()) return;
        this.loading.set(true);
        this.carregado.set(false);
        this.errorMessage.set('');
        this.avisoSelecao.set('');
        forkJoin({
            curso: this.setupService.obterCurso(),
            disciplinas: this.setupService.listarDisciplinas(),
        }).pipe(
            map(resposta => {
                const { curso, disciplinas } = resposta;
                if (!curso || !Array.isArray(curso.periodos) ||
                    curso.periodos.some(periodo => typeof periodo !== 'string') ||
                    !Array.isArray(disciplinas) || disciplinas.some(item => !item ||
                        typeof item.id !== 'string' || typeof item.nome !== 'string' ||
                        typeof item.periodo !== 'string')) {
                    throw new Error('Resposta da matriz inválida.');
                }
                return resposta;
            }),
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading.set(false)),
        ).subscribe({
            next: ({ curso, disciplinas }) => {
                const ids = new Set(disciplinas.map(item => item.id));
                if (!curso.periodos.includes(this.setupService.selectedPeriod() ?? '') ||
                    ids.size !== disciplinas.length ||
                    disciplinas.some(item => !item.id || !item.nome || !curso.periodos.includes(item.periodo))) {
                    this.errorMessage.set('A matriz do curso está incompleta. Tente carregar novamente.');
                    return;
                }
                this.periodos.set(curso.periodos);
                this.disciplinas.set(disciplinas);
                const anteriores = this.setupService.selectedDisciplinas();
                const disponiveis = anteriores.filter(id => ids.has(id));
                if (disponiveis.length !== anteriores.length) {
                    this.avisoSelecao.set('Disciplinas que não estão mais disponíveis foram removidas da seleção.');
                }
                this.setupService.definirDisciplinas(disponiveis);
                this.carregado.set(true);
            },
            error: (error: unknown) => this.errorMessage.set(this.apiError.mensagem(error,
                'Não foi possível carregar as disciplinas. Tente novamente.')),
        });
    }

    tipo(disciplina: Disciplina): TipoDisciplina {
        const atual = this.periodos().indexOf(this.setupService.selectedPeriod() ?? '');
        const origem = this.periodos().indexOf(disciplina.periodo);
        return origem < atual ? 'DP' : origem > atual ? 'Adiantamento' : 'Regular';
    }

    selecionar(id: string): void {
        if (!this.carregado() || this.loading() || this.saving() ||
            !this.disciplinas().some(item => item.id === id)) return;
        const ids = this.setupService.selectedDisciplinas();
        this.setupService.definirDisciplinas(
            ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
    }

    adicionarTodas(): void {
        if (!this.podeAdicionarTodas()) return;
        this.setupService.definirDisciplinas([
            ...this.setupService.selectedDisciplinas(),
            ...this.disciplinasDoPeriodo().map(item => item.id),
        ]);
    }

    limparFiltros(): void {
        this.busca.set('');
        this.filtroPeriodo.set(this.setupService.selectedPeriod());
    }

    voltar(): void {
        if (!this.saving()) void this.router.navigate(['/setup/period-selection']);
    }

    concluir(): void {
        if (!this.carregado() || this.loading() || this.saving() || !this.selecionadas().length) return;
        this.saving.set(true);
        this.errorMessage.set('');
        this.setupService.submitProfile().pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.saving.set(false)),
        ).subscribe({
            next: () => { void this.router.navigate(['/dashboard']); },
            error: (error: unknown) => this.errorMessage.set(this.apiError.mensagem(error,
                'Não foi possível salvar sua grade. Suas escolhas foram mantidas. Tente novamente.')),
        });
    }

    private normalizar(texto: string): string {
        return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    }
}
