import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileSetupService } from '../../services/profile-setup.service';

@Component({
  selector: 'app-setup-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './setup-sidebar.html',
  styleUrl: './setup-sidebar.scss'
})
export class SetupSidebar {
  // Injetando o serviço para usar o Signal no HTML
  public setupService = inject(ProfileSetupService);
}