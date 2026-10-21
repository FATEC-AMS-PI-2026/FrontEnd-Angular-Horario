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

    it('mantém as quatro etapas no retorno pelas configurações, antes e depois de alterar disciplinas', () => {
        spyOn(component.setupService, 'returningUser').and.returnValue(true);
        component.setupService.currentStep.set(3);
        fixture.detectChanges();
        const etapas = fixture.nativeElement.querySelectorAll('.setup-sidebar__step') as NodeListOf<HTMLElement>;
        expect(etapas.length).toBe(4);
        expect(etapas[2].classList.contains('setup-sidebar__step--active')).toBeTrue();
        expect(etapas[3].textContent).toContain('Escolher disciplinas');
        expect(etapas[3].classList.contains('setup-sidebar__step--disabled')).toBeTrue();
        expect(fixture.nativeElement.textContent).not.toContain('Último passo');

        component.setupService.currentStep.set(4);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.setup-sidebar__step').length).toBe(4);
        expect(etapas[3].isConnected).toBeTrue();
        expect(etapas[3].classList.contains('setup-sidebar__step--active')).toBeTrue();
        expect(etapas[3].classList.contains('setup-sidebar__step--disabled')).toBeFalse();

        component.setupService.currentStep.set(3);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.setup-sidebar__step').length).toBe(4);
        expect(etapas[3].classList.contains('setup-sidebar__step--disabled')).toBeTrue();
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
