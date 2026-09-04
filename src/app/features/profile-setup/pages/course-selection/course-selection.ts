import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileSetupService } from '../../services/profile-setup.service';

@Component({
  selector: 'app-course-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-selection.html',
  styleUrl: './course-selection.scss'
})
export class CourseSelection {
  public setupService = inject(ProfileSetupService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  selectedFilter = signal<string>('Todos');
  filters = ['Todos', 'Manhã', 'Tarde', 'Noite', 'Tecnólogo'];

  // All 6 courses restored to the mock data
  courses = signal([
    { id: '1', title: 'Análise e Desenvolvimento de Sistemas', type: 'Tecnólogo', period: 'Período: Manhã', unit: 'Fatec Itu', category: 'Manhã', icon: 'code' },
    { id: '2', title: 'Análise e Desenvolvimento de Sistemas', type: 'Tecnólogo', period: 'Período: Tarde (AMS)', unit: 'Fatec Itu', category: 'Tarde', icon: 'code' },
    { id: '3', title: 'Gestão de Processos Gerenciais', type: 'Tecnólogo', period: 'Período: Manhã', unit: 'Fatec Itu', category: 'Manhã', icon: 'chart' },
    { id: '4', title: 'Gestão de Eventos', type: 'Tecnólogo', period: 'Período: Manhã', unit: 'Fatec Itu', category: 'Manhã', icon: 'calendar' },
    { id: '5', title: 'Mecatrônica Industrial', type: 'Tecnólogo', period: 'Período: Noite', unit: 'Fatec Itu', category: 'Noite', icon: 'bot' },
    { id: '6', title: 'Secretariado', type: 'Tecnólogo', period: 'Período: Manhã', unit: 'Fatec Itu', category: 'Manhã', icon: 'briefcase' }
  ]);

  filteredCourses = computed(() => {
    let filtered = this.courses();

    if (this.selectedFilter() !== 'Todos') {
      filtered = filtered.filter(c => c.category === this.selectedFilter() || c.type === this.selectedFilter());
    }

    if (this.searchQuery().trim()) {
      const term = this.searchQuery().toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(term));
    }
    return filtered;
  });

  selectedCourseId = signal<string | null>(null);
  selectedCourseTitle: string | null = null;

  setFilter(filter: string) {
    this.selectedFilter.set(filter);
  }

  selectCourse(id: string, title: string) {
    this.selectedCourseId.set(id);
    this.selectedCourseTitle = title;
  }

  onContinue() {
    if (!this.selectedCourseTitle) return;

    this.setupService.setCourse(this.selectedCourseTitle);

    // Fix: Using the correct path from app.routes.ts
    this.router.navigate(['/setup/period-selection']);
  }
}