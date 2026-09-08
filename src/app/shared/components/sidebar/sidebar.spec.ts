import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';
import { SessionService } from '../../../core/services/session.service';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])] 
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('aciona o logout centralizado pelo botão Sair', () => {
    const logout = spyOn(TestBed.inject(SessionService), 'logout');
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('button[aria-label="Sair"]')!.click();
    expect(logout).toHaveBeenCalled();
  });
});
