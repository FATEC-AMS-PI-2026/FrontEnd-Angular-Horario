import { FigmaIcon } from '../figma-icon/figma-icon';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FigmaIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly session = inject(SessionService);
  protected readonly links = [
    { label: 'Início', path: '/dashboard', icon: 'home' },
    { label: 'Horários', path: '/horarios', icon: 'clock' },
    { label: 'Grade semanal', path: '/grade-semanal', icon: 'calendar-nav' },
    { label: 'Salas', path: '/salas', icon: 'rooms' },
    { label: 'Professores', path: '/professores', icon: 'person' },
    { label: 'Configurações', path: '/configuracoes', icon: 'settings' }
  ] as const;

  logout() {
    this.session.logout();
  }
}
