import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DisciplineSelection } from './discipline-selection';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { environment } from '../../../../../environments/environment';

describe('DisciplineSelection', () => {
  let component: DisciplineSelection;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DisciplineSelection], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const setup = TestBed.inject(ProfileSetupService);
    setup.setCourse('ADS', 'ads');
    setup.setPeriod('1º período');
    http = TestBed.inject(HttpTestingController);
    component = TestBed.createComponent(DisciplineSelection).componentInstance;
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.ngOnInit();
    http.expectOne(request => request.url.endsWith('/cursos/ads/disciplinas')).flush([{ id: 'bd', nome: 'Banco de dados' }]);
  });
  afterEach(() => http.verify());

  it('exige seleção e aguarda persistência para concluir o onboarding', () => {
    component.concluir();
    http.expectNone(environment.apiUrl + '/usuarios/me/perfil');
    component.selecionar('bd');
    component.concluir();
    component.concluir();
    const request = http.expectOne(environment.apiUrl + '/usuarios/me/perfil');
    expect(navigate).not.toHaveBeenCalled();
    request.flush({
      usuario: { nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: 'ADS', periodo: '1º período' },
      cursoId: 'ads', disciplinasIds: ['bd'], configuracaoInicialConcluida: true,
    });
    expect(navigate).toHaveBeenCalledOnceWith(['/dashboard']);
  });

  it('preserva a seleção e fica na etapa quando a API falha', () => {
    component.selecionar('bd');
    component.concluir();
    http.expectOne(environment.apiUrl + '/usuarios/me/perfil').flush({}, { status: 500, statusText: 'Error' });
    expect(component.setupService.selectedDisciplinas()).toEqual(['bd']);
    expect(component.saving()).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
  });
});
