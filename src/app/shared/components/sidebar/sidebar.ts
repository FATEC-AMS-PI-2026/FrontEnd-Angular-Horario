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
    { label: 'Grade Semanal', path: '/grade-semanal' },
    { label: 'Salas', path: '/salas' },
    // demais itens (Professores, Cursos/Turmas, Cronograma...) entram
    // conforme os módulos administrativos forem implementados (Fase 3)
  ];
}
