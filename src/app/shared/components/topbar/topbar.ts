import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { SettingsSearchService } from '../../../core/services/settings-search.service';
import { FigmaIcon } from '../figma-icon/figma-icon';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [FigmaIcon],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnInit {
  protected readonly busca = inject(SettingsSearchService);
  private readonly document = inject(DOCUMENT);

  protected abrirNotificacoes(): void {
    this.busca.termo.set('');
    // Aguarda o card reaparecer caso a busca o tenha ocultado.
    requestAnimationFrame(() => this.document.getElementById('notificacoes')?.focus());
  }
  // Título padrão
  title: string = 'Início';

  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    // Escuta a mudança de rotas
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: NavigationEnd) => {
      this.setTitleBasedOnRoute(event.urlAfterRedirects);
    });

    // Seta o título na primeira carga da página
    this.setTitleBasedOnRoute(this.router.url);
  }

  private setTitleBasedOnRoute(url: string) {
    // Rotas principais
    if (url.includes('/dashboard')) this.title = 'Início';
    else if (url.includes('/grade-semanal')) this.title = 'Grade Semanal';
    else if (url.includes('/salas')) this.title = 'Salas';
    else if (url.includes('/horarios')) this.title = 'Horários';
    else if (url.includes('/professores')) this.title = 'Professores';
    else if (url.includes('/configuracoes')) this.title = 'Configurações';

    // Rotas de Setup de Perfil
    else if (url.includes('/course-selection')) this.title = 'Escolha seu curso';
    else if (url.includes('/period-selection')) this.title = 'Escolha seu período';

    // Fallback padrão
    else this.title = 'GINI';
  }
}
