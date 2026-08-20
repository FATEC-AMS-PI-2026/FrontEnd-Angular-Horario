import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly links = [
    { label: 'Dashboard', path: '/dashboard' },
    // demais itens (Professores, Cursos/Turmas, Salas, Cronograma...) entram
    // conforme os módulos administrativos forem implementados (Fase 3)
  ];
}
