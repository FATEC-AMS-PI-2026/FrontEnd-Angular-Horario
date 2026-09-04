import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProfileSetupService } from '../../services/profile-setup.service';

@Component({
  selector: 'app-period-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './period-selection.html',
  styleUrl: './period-selection.scss'
})
export class PeriodSelection {
  public setupService = inject(ProfileSetupService);
  private router = inject(Router);

  selecionar(periodo: string) {
    this.setupService.setPeriod(periodo);
  }

  voltar() {
    this.setupService.goBack();
    // Verifique se essa é a rota exata no seu app.routes.ts
    this.router.navigate(['/setup/curso']);
  }

  concluir() {
    this.setupService.submitProfile();
    this.router.navigate(['/dashboard']);
  }
}