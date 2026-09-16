import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { CursoDetalhes } from '../../models/profile.model';

@Component({
    selector: 'app-period-selection',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './period-selection.html',
    styleUrl: './period-selection.scss',
})
export class PeriodSelection implements OnInit {
    readonly setupService = inject(ProfileSetupService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly curso = signal<CursoDetalhes | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal('');

    ngOnInit(): void {
        this.setupService.currentStep.set(3);
        this.carregar();
    }

    carregar(): void {
        if (this.loading()) return;
        this.loading.set(true);
        this.errorMessage.set('');
        this.setupService.obterCurso().pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading.set(false)),
        ).subscribe({
            next: curso => {
                this.curso.set(curso);
                if (!curso.periodos.includes(this.setupService.selectedPeriod() ?? '')) {
                    this.setupService.selectedPeriod.set(null);
                }
            },
            error: () => this.errorMessage.set('Não foi possível carregar os períodos. Tente novamente.'),
        });
    }

    selecionar(periodo: string): void {
        if (!this.saving() && this.curso()?.periodos.includes(periodo)) {
            this.setupService.setPeriod(periodo);
        }
    }

    voltar(): void {
        if (this.saving() || this.setupService.returningUser()) return;
        this.setupService.goBack();
        void this.router.navigate(['/setup/course-selection']);
    }

    concluir(alterarDisciplinas = false): void {
        if (this.loading() || this.saving() || !this.setupService.isSetupComplete() ||
            !this.curso()?.periodos.includes(this.setupService.selectedPeriod() ?? '')) return;
        // TEMPORÁRIO: excluir a condição modoDemonstracao após integrar o backend.
        if (!this.setupService.returningUser() && !this.setupService.modoDemonstracao) {
            void this.router.navigate(['/setup/discipline-selection']);
            return;
        }
        this.saving.set(true);
        this.errorMessage.set('');
        this.setupService.confirmarPeriodo().pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.saving.set(false)),
        ).subscribe({
            next: () => {
                void this.router.navigate([alterarDisciplinas ? '/setup/discipline-selection' : '/dashboard']);
            },
            error: () => this.errorMessage.set('Não foi possível salvar o período. Tente novamente.'),
        });
    }
}
