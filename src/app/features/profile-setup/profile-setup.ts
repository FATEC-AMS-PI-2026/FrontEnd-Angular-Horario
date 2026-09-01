import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SetupSidebar } from './components/setup-sidebar/setup-sidebar';
import { Topbar } from '../../shared/components/topbar/topbar';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SetupSidebar, Topbar],
  templateUrl: './profile-setup.html',
  styleUrl: './profile-setup.scss'
})
export class ProfileSetup implements OnInit {
  currentStep = 2;

  constructor(private router: Router) { }

  ngOnInit() {
    // Verifica a rota no momento em que carrega a tela pela primeira vez
    this.updateStep(this.router.url);

    // Fica ouvindo mudanças de rota (quando clicar em Continuar ou Voltar)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateStep(event.urlAfterRedirects);
    });
  }

  private updateStep(url: string) {
    if (url.includes('period-selection')) {
      this.currentStep = 3;
    } else {
      this.currentStep = 2;
    }
  }
}