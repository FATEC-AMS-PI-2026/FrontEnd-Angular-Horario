/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend e remover o modo demo.
 * Verifica as duas jornadas locais, restauração e bloqueio em produção.
 */
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { AuthService } from './auth.service';
import { DemoAuthService } from './demo-auth.service';
import { SessionService } from '../../../core/services/session.service';
import { profileGuard } from '../../../core/guards/profile.guard';
import { ProfileSetupService } from '../../profile-setup/services/profile-setup.service';

@Component({ template: '' })
class PaginaDemoTeste {}

describe('TEMPORÁRIO: duas jornadas demonstrativas', () => {
  const original = { production: environment.production, demoAuth: environment.demoAuth };
  let http: HttpTestingController;
  let auth: AuthService;
  let setup: ProfileSetupService;

  function configurar(): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([
        { path: 'login', component: PaginaDemoTeste },
        { path: '', canActivateChild: [profileGuard], children: [
          { path: 'dashboard', component: PaginaDemoTeste },
          { path: 'setup/course-selection', component: PaginaDemoTeste },
          { path: 'setup/period-selection', component: PaginaDemoTeste },
          { path: 'setup/discipline-selection', component: PaginaDemoTeste },
        ] },
      ])],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    setup = TestBed.inject(ProfileSetupService);
  }

  beforeEach(() => {
    ['gini_token', 'gini_usuario', 'gini_demo_perfil'].forEach(key => localStorage.removeItem(key));
    environment.production = false;
    environment.demoAuth = true;
    configurar();
  });

  afterEach(() => {
    http.verify();
    Object.assign(environment, original);
    ['gini_token', 'gini_usuario', 'gini_demo_perfil'].forEach(key => localStorage.removeItem(key));
  });

  function entrar(email: string): void {
    auth.login(email, 'Demo123!').subscribe();
  }

  it('primeiro acesso passa por curso e período antes de liberar dashboard, sem HTTP', async () => {
    const next = jasmine.createSpy('next');
    auth.login('primeiro@gini.local', 'Demo123!').subscribe(next);
    expect(next).toHaveBeenCalledOnceWith('/setup/course-selection');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/setup/course-selection');
    await harness.navigateByUrl('/setup/period-selection');
    expect(TestBed.inject(Router).url).toBe('/setup/course-selection');
    setup.listarCursos().subscribe(cursos => {
      expect(cursos.length).toBeGreaterThan(0);
      setup.setCourse(cursos[0].title, cursos[0].id);
    });
    await harness.navigateByUrl('/setup/period-selection');
    expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
    setup.obterCurso().subscribe(curso => setup.setPeriod(curso.periodos[0]));
    setup.confirmarPeriodo().subscribe();
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    http.expectNone(() => true);
  });

  it('cada login da primeira conta reinicia curso e período, mesmo depois de concluir', () => {
    entrar('primeiro@gini.local');
    setup.setCourse('ADS', 'demo-ads-manha');
    setup.setPeriod('1º período');
    setup.confirmarPeriodo().subscribe();
    entrar('primeiro@gini.local');
    expect(setup.returningUser()).toBeFalse();
    expect(setup.selectedCourseId()).toBeNull();
    expect(setup.selectedPeriod()).toBeNull();
    expect(setup.periodoConfirmado()).toBeFalse();
  });

  it('reentrada pula curso, exige confirmação e preserva o curso da conta', async () => {
    const next = jasmine.createSpy('next');
    auth.login('demo@gini.local', 'Demo123!').subscribe(next);
    expect(next).toHaveBeenCalledOnceWith('/setup/period-selection');
    expect(setup.selectedCourseId()).toBe('demo-ads-manha');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/setup/course-selection');
    expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
    setup.setPeriod('3º período');
    setup.confirmarPeriodo().subscribe();
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(TestBed.inject(SessionService).usuario()?.periodo).toBe('3º período');
    entrar('demo@gini.local');
    expect(setup.periodoConfirmado()).toBeFalse();
    http.expectNone(() => true);
  });

  it('trocar de conta não herda as escolhas da outra demonstração', () => {
    entrar('primeiro@gini.local');
    setup.setCourse('ADS tarde', 'demo-ads-tarde');
    setup.setPeriod('4º período');
    entrar('demo@gini.local');
    expect(setup.selectedCourseId()).toBe('demo-ads-manha');
    expect(setup.selectedPeriod()).toBe('2º período');
    entrar('primeiro@gini.local');
    expect(setup.selectedCourseId()).toBeNull();
  });

  it('restaura escolhas e conclusão após atualizar a página', async () => {
    entrar('primeiro@gini.local');
    setup.setCourse('ADS', 'demo-ads-manha');
    setup.setPeriod('1º período');
    TestBed.resetTestingModule();
    configurar();
    let harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/setup/period-selection');
    expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
    expect(setup.selectedPeriod()).toBe('1º período');
    setup.confirmarPeriodo().subscribe();
    TestBed.resetTestingModule();
    configurar();
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    http.expectNone(() => true);
  });

  it('a demonstração não abre a etapa de disciplinas', async () => {
    entrar('demo@gini.local');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/setup/discipline-selection');
    expect(TestBed.inject(Router).url).toBe('/setup/period-selection');
    setup.confirmarPeriodo().subscribe();
    await harness.navigateByUrl('/setup/discipline-selection');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    http.expectNone(() => true);
  });

  it('recusa senha incorreta e limpa sessão e escolhas', () => {
    entrar('demo@gini.local');
    const error = jasmine.createSpy('error');
    auth.login('demo@gini.local', 'incorreta').subscribe({ error });
    expect(error).toHaveBeenCalledWith(jasmine.objectContaining({ status: 401 }));
    expect(localStorage.getItem('gini_token')).toBeNull();
    expect(localStorage.getItem('gini_demo_perfil')).toBeNull();
    http.expectNone(() => true);
  });

  it('sair remove o acesso e o progresso local', async () => {
    entrar('demo@gini.local');
    const harness = await RouterTestingHarness.create();
    auth.logout();
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(localStorage.getItem('gini_demo_perfil')).toBeNull();
  });

  it('bloqueia a sessão demo em produção mesmo com flag ligada', async () => {
    entrar('demo@gini.local');
    environment.production = true;
    expect(TestBed.inject(DemoAuthService).habilitado).toBeFalse();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(localStorage.getItem('gini_token')).toBeNull();
    http.expectNone(() => true);
  });

  it('usa HTTP real quando a demonstração está desligada', () => {
    environment.demoAuth = false;
    auth.login('demo@gini.local', 'Demo123!').subscribe({ error: () => {} });
    http.expectOne(environment.apiUrl + '/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('recusa período inexistente sem liberar dashboard', () => {
    entrar('demo@gini.local');
    setup.setPeriod('99º período');
    const error = jasmine.createSpy('error');
    setup.confirmarPeriodo().subscribe({ error });
    expect(error).toHaveBeenCalled();
    expect(setup.periodoConfirmado()).toBeFalse();
  });
});
