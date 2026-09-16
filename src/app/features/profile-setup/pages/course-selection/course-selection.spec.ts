import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CourseSelection } from './course-selection';
import { environment } from '../../../../../environments/environment';

describe('CourseSelection', () => {
    let component: CourseSelection;
    let http: HttpTestingController;
    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [CourseSelection], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        component = TestBed.createComponent(CourseSelection).componentInstance;
    });
    afterEach(() => http.verify());
    it('carrega cursos do serviço, filtra e guarda o identificador ao avançar', () => {
        component.ngOnInit();
        expect(component.loading()).toBeTrue();
        http.expectOne(environment.apiUrl + '/cursos').flush([
            { id: 'ads', title: 'ADS', category: 'Manhã', type: 'Tecnólogo' },
            { id: 'evt', title: 'Eventos', category: 'Noite', type: 'Tecnólogo' },
        ]);
        component.searchQuery.set('ads');
        expect(component.filteredCourses().length).toBe(1);
        component.selectCourse('ads', 'ADS');
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        component.onContinue();
        expect(component.setupService.selectedCourseId()).toBe('ads');
        expect(navigate).toHaveBeenCalledOnceWith(['/setup/period-selection']);
    });
    it('exibe erro e permite recarregar sem fornecer cursos fictícios', () => {
        component.ngOnInit();
        http.expectOne(environment.apiUrl + '/cursos').flush({}, { status: 503, statusText: 'Unavailable' });
        expect(component.courses()).toEqual([]);
        expect(component.errorMessage()).toContain('Não foi possível');
        component.carregar();
        http.expectOne(environment.apiUrl + '/cursos').flush([]);
        expect(component.errorMessage()).toBe('');
    });

    it('trata resposta incompatível como erro e mantém a navegação bloqueada', () => {
        component.ngOnInit();
        http.expectOne(environment.apiUrl + '/cursos').flush({ content: [], totalPages: 0 });
        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toContain('Não foi possível');
        const navigate = spyOn(TestBed.inject(Router), 'navigate');
        component.onContinue();
        expect(navigate).not.toHaveBeenCalled();
    });
});
