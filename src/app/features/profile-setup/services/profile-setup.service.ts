import { Injectable, signal, computed, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';

export interface ProfileSetupPayload {
  curso: string;
  periodo: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileSetupService {
  private readonly session = inject(SessionService);
  // Signals guardam o estado atual
  currentStep = signal<number>(2);
  selectedCourse = signal<string | null>(null);
  selectedPeriod = signal<string | null>(null);

  // Computed reage automaticamente às mudanças
  isSetupComplete = computed(() => {
    return this.selectedCourse() !== null && this.selectedPeriod() !== null;
  });

  setCourse(curso: string) {
    this.selectedCourse.set(curso);
    this.currentStep.set(3);
  }

  setPeriod(periodo: string) {
    this.selectedPeriod.set(periodo);
  }

  goBack() {
    if (this.currentStep() > 2) {
      this.currentStep.update(step => step - 1);
      this.selectedPeriod.set(null);
    }
  }

  submitProfile() {
    if (!this.isSetupComplete()) return;
    const payload: ProfileSetupPayload = {
      curso: this.selectedCourse()!,
      periodo: this.selectedPeriod()!
    };
    this.session.atualizarPerfil(payload.curso, payload.periodo);
  }
}
