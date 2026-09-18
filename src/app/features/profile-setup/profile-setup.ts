import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SetupSidebar } from './components/setup-sidebar/setup-sidebar';
import { ProfileSetupService } from './services/profile-setup.service';
import { Topbar } from '../../shared/components/topbar/topbar';

@Component({
    selector: 'app-profile-setup',
    standalone: true,
    imports: [CommonModule, RouterOutlet, SetupSidebar, Topbar],
    templateUrl: './profile-setup.html',
    styleUrl: './profile-setup.scss'
})
export class ProfileSetup {
    readonly setupService = inject(ProfileSetupService);
}
