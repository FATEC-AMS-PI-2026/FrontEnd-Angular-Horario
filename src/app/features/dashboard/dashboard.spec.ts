import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('abre a lista de salas pelos dois atalhos sem recarregar a aplicação', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const element: HTMLElement = fixture.nativeElement;
    const links = element.querySelectorAll<HTMLAnchorElement>('a[routerLink="/salas"]');
    expect(links.length).toBe(2);
    links.forEach(link => link.click());
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate.calls.allArgs().map(args => args[0].toString())).toEqual(['/salas', '/salas']);
  });

  it('abre a grade semanal pelo atalho de horários', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLAnchorElement>('a[routerLink="/grade-semanal"]')!.click();
    expect(navigate.calls.mostRecent().args[0].toString()).toBe('/grade-semanal');
  });
});
