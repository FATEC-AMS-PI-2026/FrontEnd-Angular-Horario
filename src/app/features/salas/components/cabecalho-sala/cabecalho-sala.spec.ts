import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CabecalhoSala } from './cabecalho-sala';

describe('Capacidade no cabeçalho da sala', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [CabecalhoSala], providers: [provideRouter([])],
  }));

  for (const capacidade of [undefined, null]) {
    it(`oculta o bloco e o rótulo quando a capacidade é ${String(capacidade)}`, () => {
      const fixture = TestBed.createComponent(CabecalhoSala);
      fixture.componentRef.setInput('sala', { id: 1, nome: 'Sala de teste', capacidade });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.cabecalho-sala__resumo')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Capacidade de alunos');
    });
  }

  for (const capacidade of [0, 40]) {
    it(`exibe a capacidade informada ${capacidade}, inclusive zero`, () => {
      const fixture = TestBed.createComponent(CabecalhoSala);
      fixture.componentRef.setInput('sala', { id: 1, nome: 'Sala de teste', capacidade });
      fixture.detectChanges();

      const resumo = fixture.nativeElement.querySelector('.cabecalho-sala__resumo') as HTMLElement | null;
      expect(resumo?.textContent).toContain('Capacidade de alunos:');
      expect(resumo?.querySelector('strong')?.textContent?.trim()).toBe(String(capacidade));
    });
  }
});
