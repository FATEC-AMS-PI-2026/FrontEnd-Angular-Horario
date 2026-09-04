import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly links = [
    { label: 'Início', path: '/dashboard', icon: 'home' },
    { label: 'Horários', path: '/horarios', icon: 'clock' },
    { label: 'Grade semanal', path: '/grade-semanal', icon: 'calendar' },
    { label: 'Salas', path: '/salas', icon: 'room' },
    { label: 'Professores', path: '/professores', icon: 'users' },
    { label: 'Configurações', path: '/configuracoes', icon: 'settings' }
  ];

  logout() {
    // Lógica futura de logout
    console.log('Saindo do sistema...');
  }
}