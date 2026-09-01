import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-setup-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-sidebar.html',
  styleUrl: './setup-sidebar.scss'
})
export class SetupSidebar {
  @Input() currentStep = 1;
}