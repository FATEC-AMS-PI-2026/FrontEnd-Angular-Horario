import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SetupSidebar } from './components/setup-sidebar/setup-sidebar';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SetupSidebar],
  templateUrl: './profile-setup.html',
  styleUrl: './profile-setup.scss'
})
export class ProfileSetup {}