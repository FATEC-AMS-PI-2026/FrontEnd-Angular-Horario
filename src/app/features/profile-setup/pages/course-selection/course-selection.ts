import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map } from 'rxjs';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { Course } from '../../models/course.model';
import { ApiErrorService } from '../../../../core/services/api-error.service';

@Component({
    selector: 'app-course-selection',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './course-selection.html',
    styleUrl: './course-selection.scss',
})
export class CourseSelection implements OnInit {
    readonly setupService = inject(ProfileSetupService);
    private readonly router = inject(Router);
    private readonly apiError = inject(ApiErrorService);
    private readonly destroyRef = inject(DestroyRef);
    readonly searchQuery = signal('');
    readonly selectedFilter = signal('Todos');
    readonly filters = ['Todos', 'Manhã', 'Tarde', 'Noite', 'Tecnólogo'];
    readonly courses = signal<Course[]>([]);
    readonly selectedCourseId = signal<string | null>(this.setupService.selectedCourseId());
    readonly loading = signal(false);
    readonly errorMessage = signal('');
    readonly filteredCourses = computed(() => this.courses().filter(course =>
        (this.selectedFilter() === 'Todos' || course.category === this.selectedFilter() ||
            course.type === this.selectedFilter()) &&
        course.title.toLocaleLowerCase().includes(this.searchQuery().trim().toLocaleLowerCase())));

    ngOnInit(): void {
        this.setupService.currentStep.set(2);
        this.carregar();
    }

    carregar(): void {
        if (this.loading()) return;
        this.loading.set(true);
        this.errorMessage.set('');
        this.courses.set([]);
        this.setupService.listarCursos().pipe(
            map(cursos => {
                if (!Array.isArray(cursos) || cursos.some(curso => !curso ||
                    typeof curso.id !== 'string' || typeof curso.title !== 'string')) {
                    throw new Error('Resposta de cursos inválida.');
                }
                return cursos;
            }),
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading.set(false)),
        ).subscribe({
            next: cursos => {
                this.courses.set(cursos);
                if (!cursos.some(curso => curso.id === this.selectedCourseId())) {
                    this.selectedCourseId.set(null);
                }
            },
            error: (error: unknown) => this.errorMessage.set(this.apiError.mensagem(error,
                'Não foi possível carregar os cursos. Tente novamente.')),
        });
    }

    setFilter(filter: string): void { this.selectedFilter.set(filter); }
    selectCourse(id: string, _title: string): void {
        if (!this.loading() && !this.errorMessage() && this.courses().some(curso => curso.id === id)) {
            this.selectedCourseId.set(id);
        }
    }

    onContinue(): void {
        const curso = this.courses().find(c => c.id === this.selectedCourseId());
        if (!curso || this.loading() || this.errorMessage()) return;
        this.setupService.setCourse(curso.title, curso.id);
        void this.router.navigate(['/setup/period-selection']);
    }
}
