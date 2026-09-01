import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Course } from '../../models/course.model';

@Component({
  selector: 'app-course-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-selection.html',
  styleUrl: './course-selection.scss'
})
export class CourseSelection {
  searchQuery = signal<string>('');
  selectedFilter = signal<string>('Todos');
  selectedCourseId = signal<string | null>(null);

  courses = signal<Course[]>([
    {
      id: '1',
      title: 'Análise e Desenvolvimento de Sistemas',
      period: 'Período: Manhã',
      unit: 'Fatec Itu',
      type: 'Tecnólogo',
      category: 'Manhã',
      icon: 'code'
    },
    {
      id: '2',
      title: 'Análise e Desenvolvimento de Sistemas',
      period: 'Período: Tarde (AMS)',
      unit: 'Fatec Itu',
      type: 'Tecnólogo',
      category: 'Tarde',
      icon: 'code'
    },
    {
      id: '3',
      title: 'Gestão de Processos Gerenciais',
      period: 'Período: Manhã',
      unit: 'Fatec Itu',
      type: 'Tecnólogo',
      category: 'Manhã',
      icon: 'chart'
    },
    {
      id: '4',
      title: 'Gestão de Eventos',
      period: 'Período: Manhã',
      unit: 'Fatec Itu',
      type: 'Tecnólogo',
      category: 'Manhã',
      icon: 'calendar'
    },
    {
      id: '5',
      title: 'Mecatrônica Industrial',
      period: 'Período: Noite',
      unit: 'Fatec Itu',
      type: 'Tecnólogo',
      category: 'Noite',
      icon: 'bot'
    },
    {
      id: '6',
      title: 'Secretariado',
      period: 'Período: Manhã',
      unit: 'Fatec Itu',
      type: 'Tecnólogo',
      category: 'Manhã',
      icon: 'briefcase'
    }
  ]);

  filters = ['Todos', 'Manhã', 'Tarde', 'Noite', 'Tecnólogo'];

  filteredCourses = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();

    return this.courses().filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(query) ||
        course.period.toLowerCase().includes(query);

      const matchesFilter = filter === 'Todos' ? true :
        filter === 'Tecnólogo' ? course.type === 'Tecnólogo' :
          course.category === filter;

      return matchesSearch && matchesFilter;
    });
  });

  constructor(private router: Router) { }

  setFilter(filter: string) {
    this.selectedFilter.set(filter);
  }

  selectCourse(id: string) {
    this.selectedCourseId.set(id);
  }

  onContinue() {
    if (this.selectedCourseId()) {
      // Navega para a próxima etapa: Escolha seu período
      this.router.navigate(['/setup/period-selection']);
    }
  }
}