import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupSidebar } from './setup-sidebar';

describe('SetupSidebar', () => {
    let component: SetupSidebar;
    let fixture: ComponentFixture<SetupSidebar>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])], imports: [SetupSidebar]
        })
            .compileComponents();

        fixture = TestBed.createComponent(SetupSidebar);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('mostra check no período ao avançar para disciplinas e restaura o número ao voltar', () => {
        component.setupService.currentStep.set(4);
        fixture.detectChanges();
        const periodo = fixture.nativeElement.querySelectorAll('.setup-sidebar__step')[2] as HTMLElement;
        expect(periodo.classList.contains('setup-sidebar__step--completed')).toBeTrue();
        expect(periodo.querySelector('svg')).not.toBeNull();
        component.setupService.currentStep.set(3);
        fixture.detectChanges();
        expect(periodo.querySelector('svg')).toBeNull();
        expect(periodo.querySelector('.setup-sidebar__step-icon')?.textContent?.trim()).toBe('3');
    });
});
