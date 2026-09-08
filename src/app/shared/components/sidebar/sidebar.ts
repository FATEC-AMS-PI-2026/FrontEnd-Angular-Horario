import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly session = inject(SessionService);
  protected readonly links = [
    { label: 'Início', path: '/dashboard', icon: 'home' },
    { label: 'Horários', path: '/horarios', icon: 'clock' },
    { label: 'Grade semanal', path: '/grade-semanal', icon: 'calendar' },
    { label: 'Salas', path: '/salas', icon: 'room' },
    { label: 'Professores', path: '/professores', icon: 'users' },
    { label: 'Configurações', path: '/configuracoes', icon: 'settings' }
  ];

  logout() {
    this.session.logout();
  }
}
