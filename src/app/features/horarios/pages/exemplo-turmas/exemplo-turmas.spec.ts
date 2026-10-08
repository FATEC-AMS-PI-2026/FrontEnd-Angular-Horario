import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExemploTurmas } from './exemplo-turmas';

describe('ExemploTurmas: Service real com transporte ilustrativo isolado', () => {
  let fixture: ComponentFixture<ExemploTurmas>;
  beforeEach(() => TestBed.configureTestingModule({ imports: [ExemploTurmas], providers: [provideRouter([])] }));
  afterEach(() => fixture.destroy());

  function iniciar(): HTMLElement {
    fixture = TestBed.createComponent(ExemploTurmas);
    fixture.detectChanges();
    return fixture.nativeElement;
  }
  function selecionar(select: HTMLSelectElement, valor: string): void {
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('reúne as páginas, converte camelCase/snake_case, professor ausente e intervalo', fakeAsync(() => {
    const tela = iniciar();
    expect(tela.textContent).toContain('Carregando turmas');
    tick(300); fixture.detectChanges();
    const turma = tela.querySelectorAll('select')[1];
    expect([...turma.options].map(option => option.value)).toEqual(['', '101', '102']);
    selecionar(turma, '101');
    tick(300); fixture.detectChanges();
    expect(tela.querySelectorAll('tbody tr').length).toBe(3);
    expect(tela.textContent).toContain('Banco de dados (exemplo)');
    expect(tela.textContent).toContain('Professor a definir');
    expect(tela.textContent).toContain('Intervalo calculado');
    expect(tela.textContent).toContain('14:10 – 14:20');
    expect(tela.querySelectorAll('.exemplo__consultas li').length).toBe(4);
  }));

  it('recupera as turmas pelas alocações após 500, mantendo o filtro de curso', fakeAsync(() => {
    const tela = iniciar(); tick(300); fixture.detectChanges();
    selecionar(tela.querySelectorAll('select')[0], '2'); tick(200); fixture.detectChanges();
    tela.querySelector<HTMLInputElement>('.exemplo__falha input')!.click();
    tick(600); fixture.detectChanges();
    expect(tela.querySelectorAll('select')[1].textContent).toContain('Turma B1');
    expect(tela.querySelectorAll('select')[1].textContent).not.toContain('Turma A');
    expect(tela.querySelector('.exemplo__resultado')?.textContent).toContain('recuperou as turmas pelas alocações');
    const consultas = tela.querySelector('.exemplo__consultas')!.textContent!;
    expect(consultas).toContain('500');
    expect(consultas).toContain('/alocacoes?page=3');
  }));

  it('cancela o curso anterior ao trocar durante o carregamento', fakeAsync(() => {
    const tela = iniciar();
    selecionar(tela.querySelectorAll('select')[0], '2');
    tick(300); fixture.detectChanges();
    expect(tela.querySelectorAll('select')[1].textContent).toContain('Turma B1');
    expect(tela.querySelectorAll('select')[1].textContent).not.toContain('Turma A');
    expect(tela.querySelectorAll('.exemplo__consultas li').length).toBe(1);
    expect(tela.querySelector('.exemplo__consultas')?.textContent).toContain('curso=2');
  }));
});
