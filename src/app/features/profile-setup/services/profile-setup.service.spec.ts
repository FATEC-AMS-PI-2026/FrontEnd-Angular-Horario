import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProfileSetupService } from './profile-setup.service';
import { environment } from '../../../../environments/environment';

describe('ProfileSetupService', () => {
  let service: ProfileSetupService;
  let http: HttpTestingController;
  const base = environment.apiUrl;
  const perfil = {
    usuario: { nome: 'Ana', email: 'ana@cps.sp.gov.br', curso: 'ADS', periodo: '2º período' },
    cursoId: 'ads', disciplinasIds: ['bd'], configuracaoInicialConcluida: true,
  };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    localStorage.setItem('gini_token', 'token');
    service = TestBed.inject(ProfileSetupService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem('gini_token');
    localStorage.removeItem('gini_usuario');
  });

  it('restaura o perfil pelo servidor e confirma somente o período sem substituir disciplinas', () => {
    service.garantirPerfil().subscribe();
    http.expectOne(`${base}/usuarios/me/perfil`).flush(perfil);
    expect(service.selectedCourseId()).toBe('ads');
    service.setPeriod('3º período');
    service.confirmarPeriodo().subscribe();
    const request = http.expectOne(`${base}/usuarios/me/perfil/periodo`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ periodo: '3º período' });
    expect(service.periodoConfirmado()).toBeFalse();
    request.flush({ ...perfil, usuario: { ...perfil.usuario, periodo: '3º período' } });
    expect(service.periodoConfirmado()).toBeTrue();
    expect(service.selectedDisciplinas()).toEqual(['bd']);
  });

  it('não marca onboarding concluído antes de persistir as disciplinas', () => {
    service.setCourse('ADS', 'ads');
    service.setPeriod('2º período');
    const error = jasmine.createSpy('error');
    service.submitProfile().subscribe({ error });
    expect(error).toHaveBeenCalled();
    http.expectNone(`${base}/usuarios/me/perfil`);
    service.selectedDisciplinas.set(['bd']);
    service.submitProfile().subscribe();
    const request = http.expectOne(`${base}/usuarios/me/perfil`);
    expect(request.request.body).toEqual({ cursoId: 'ads', periodo: '2º período', disciplinasIds: ['bd'] });
    expect(service.returningUser()).toBeFalse();
    request.flush(perfil);
    expect(service.returningUser()).toBeTrue();
  });

  it('preserva as escolhas para nova tentativa quando o salvamento falha', () => {
    service.setCourse('ADS', 'ads');
    service.setPeriod('2º período');
    service.selectedDisciplinas.set(['bd']);
    service.submitProfile().subscribe({ error: () => {} });
    http.expectOne(`${base}/usuarios/me/perfil`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.returningUser()).toBeFalse();
    expect(service.selectedDisciplinas()).toEqual(['bd']);
  });

  it('descarta disciplinas e período ao trocar o curso', () => {
    service.setCourse('ADS', 'ads');
    service.setPeriod('2º período');
    service.selectedDisciplinas.set(['bd']);
    service.setCourse('Eventos', 'eventos');
    expect(service.selectedPeriod()).toBeNull();
    expect(service.selectedDisciplinas()).toEqual([]);
  });

  it('consulta novamente o servidor quando o token muda', () => {
    service.garantirPerfil().subscribe();
    http.expectOne(`${base}/usuarios/me/perfil`).flush(perfil);
    localStorage.setItem('gini_token', 'outra-conta');
    service.garantirPerfil().subscribe();
    const request = http.expectOne(`${base}/usuarios/me/perfil`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer outra-conta');
    request.flush({ ...perfil, configuracaoInicialConcluida: false, cursoId: null, disciplinasIds: [] });
    expect(service.returningUser()).toBeFalse();
    expect(service.selectedDisciplinas()).toEqual([]);
  });
});
