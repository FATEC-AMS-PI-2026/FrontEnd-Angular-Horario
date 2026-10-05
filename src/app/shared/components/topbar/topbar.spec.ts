import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Topbar } from './topbar';
import { provideRouter } from '@angular/router';
import { TopbarContextService } from '../../../core/services/topbar-context.service';

describe('Topbar', () => {
  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Topbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exibe o código da sala no breadcrumb do header e limpa ao sair dos detalhes', () => {
    component.title = 'Salas';
    const contexto = TestBed.inject(TopbarContextService);
    contexto.sala.set('LAB 01'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Salas / LAB 01');
    expect(fixture.nativeElement.querySelector('nav a').getAttribute('href')).toBe('/salas');
    contexto.sala.set(null); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Salas');
  });
});
