import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-period-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './period-selection.html',
  styleUrl: './period-selection.scss'
})
export class PeriodSelection {
  // Lista de períodos baseada na duração do curso
  periods = [1, 2, 3, 4];
  // 1º Período selecionado por padrão
  selectedPeriod = signal<number | null>(1);

  // Mock dos dados do curso selecionado na tela anterior
  courseInfo = {
    name: 'ADS Manhã',
    workload: '2.000 horas',
    duration: '4 semestres',
    location: 'FATEC Itu - Itu, SP',
    coordinator: 'Prof. Tadeu Marcus'
  };

  constructor(private router: Router) { }

  selectPeriod(period: number) {
    this.selectedPeriod.set(period);
  }

  goBack() {
    this.router.navigate(['/setup/course-selection']);
  }

  finishSetup() {
    if (this.selectedPeriod()) {
      // Quando integrado, aqui enviaria os dados ao backend
      // e depois redirecionaria para o Dashboard
      this.router.navigate(['/dashboard']);
    }
  }
}