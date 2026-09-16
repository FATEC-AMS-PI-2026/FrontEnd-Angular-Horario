import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { Disciplina } from '../../models/profile.model';

@Component({
    selector: 'app-discipline-selection',
    standalone: true,
    templateUrl: './discipline-selection.html',
    styleUrls: ['../period-selection/period-selection.scss', './discipline-selection.scss'],
})
export class DisciplineSelection implements OnInit {
    readonly setupService = inject(ProfileSetupService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly disciplinas = signal<Disciplina[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal('');

    ngOnInit(): void {
        this.setupService.currentStep.set(4);
        this.carregar();
    }

    carregar(): void {
        if (this.loading()) return;
        this.loading.set(true);
        this.errorMessage.set('');
        this.setupService.listarDisciplinas().pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading.set(false)),
        ).subscribe({
            next: disciplinas => {
                this.disciplinas.set(disciplinas);
                this.setupService.selectedDisciplinas.update(ids =>
                    ids.filter(id => disciplinas.some(disciplina => disciplina.id === id)));
            },
            error: () => this.errorMessage.set('Não foi possível carregar as disciplinas. Tente novamente.'),
        });
    }

    selecionar(id: string): void {
        if (this.loading() || this.saving() || !this.disciplinas().some(d => d.id === id)) return;
        this.setupService.selectedDisciplinas.update(ids =>
            ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
    }

    voltar(): void {
        if (!this.saving()) void this.router.navigate(['/setup/period-selection']);
    }

    concluir(): void {
        if (this.loading() || this.saving() || !this.disciplinas().length ||
            !this.setupService.selectedDisciplinas().length) return;
        this.saving.set(true);
        this.errorMessage.set('');
        this.setupService.submitProfile().pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.saving.set(false)),
        ).subscribe({
            next: () => { void this.router.navigate(['/dashboard']); },
            error: () => this.errorMessage.set('Não foi possível salvar sua grade. Tente novamente.'),
        });
    }
}
