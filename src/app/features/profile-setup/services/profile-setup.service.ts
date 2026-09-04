import { Injectable, signal, computed } from '@angular/core';

export interface ProfileSetupPayload {
  curso: string;
  periodo: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileSetupService {
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
    console.log('Payload pronto para API:', payload);
  }
}