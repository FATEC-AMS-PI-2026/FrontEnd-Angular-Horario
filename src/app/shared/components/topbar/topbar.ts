import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  // O valor padrão continua sendo o original, mas agora pode ser alterado
  @Input() title: string = 'GINI — Gestão de Horários Acadêmicos';
}