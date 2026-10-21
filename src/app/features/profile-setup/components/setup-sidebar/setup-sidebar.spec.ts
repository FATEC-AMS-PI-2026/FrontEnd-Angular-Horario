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
        const check = periodo.querySelector<HTMLElement>('app-figma-icon .icone__mascara');
        expect(check?.style.maskImage).toContain('/icons/onboarding/completed.png');
        component.setupService.currentStep.set(3);
        fixture.detectChanges();
        expect(periodo.querySelector('app-figma-icon')).toBeNull();
        expect(periodo.querySelector('.setup-sidebar__step-icon')?.textContent?.trim()).toBe('3');
    });

    it('mantém o check original legível sobre o fundo da sidebar nos dois temas', () => {
        const anterior = document.documentElement.getAttribute('data-theme');
        const luminancia = (color: string) => {
            const canais = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(canal => {
                const valor = canal / 255;
                return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
            });
            return canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
        };
        try {
            component.setupService.currentStep.set(4);
            for (const tema of ['light', 'dark']) {
                document.documentElement.setAttribute('data-theme', tema);
                fixture.detectChanges();
                const sidebar = fixture.nativeElement.querySelector('.setup-sidebar') as HTMLElement;
                const check = sidebar.querySelector('.setup-sidebar__step--completed .icone__mascara')!;
                const cores = [getComputedStyle(sidebar).backgroundColor, getComputedStyle(check).backgroundColor]
                    .map(luminancia).sort((a, b) => b - a);
                expect((cores[0] + 0.05) / (cores[1] + 0.05)).withContext(tema).toBeGreaterThanOrEqual(3);
            }
        } finally {
            if (anterior === null) document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', anterior);
        }
    });
});
