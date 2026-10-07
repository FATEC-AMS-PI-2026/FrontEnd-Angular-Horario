import { TestBed } from '@angular/core/testing';
import { EquipamentosCard } from './equipamentos-card';

describe('EquipamentosCard: inventário Java', () => {
  it('exibe recursos novos e quantidade zero sem afirmar indisponibilidade', () => {
    const fixture = TestBed.createComponent(EquipamentosCard);
    fixture.componentRef.setInput('equipamentos', [
      { id: 1, tipo: 'Projetor multimidia', nome: 'Projetor multimidia', categoria: 'Equipamento', quantidadeTotal: 0 },
      { id: 2, tipo: 'Kit Arduino', nome: 'Kit Arduino', categoria: 'Material Didatico', quantidadeTotal: 10 },
    ]);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Projetor multimidia');
    expect(el.textContent).toContain('Material Didatico');
    expect(el.querySelector('.equipamento__quantidade')?.textContent?.trim()).toBe('0');
    expect(el.querySelector('.equipamento__quantidade')?.getAttribute('aria-label')).toContain('quantidade cadastrada 0');
    expect(el.querySelector('.equipamento__quantidade--indisponivel')).toBeNull();
    expect(el.querySelector('.equipamento__quantidade--total')).toBeNull();
    fixture.componentRef.setInput('compacto', true);
    fixture.detectChanges();
    expect(el.querySelectorAll('li').length).toBe(2);
    expect(el.textContent).toContain('Kit Arduino');
  });

  it('exibe somente recursos cadastrados, limita o resumo e distingue ausência de informação', () => {
    const fixture = TestBed.createComponent(EquipamentosCard);
    fixture.componentRef.setInput('equipamentos', Array.from({ length: 5 }, (_, id) => ({
      id, tipo: 'Material', nome: 'Recurso ' + id, quantidadeTotal: id,
    })));
    fixture.componentRef.setInput('compacto', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('li').length).toBe(3);
    expect(el.textContent).toContain('+2 outros');
    fixture.componentRef.setInput('compacto', false); fixture.detectChanges();
    expect(el.querySelectorAll('li').length).toBe(5);
    expect(el.textContent).not.toContain('Wi-fi');
    fixture.componentRef.setInput('equipamentos', []); fixture.detectChanges();
    expect(el.textContent).toContain('Nenhum equipamento cadastrado');
    expect(el.querySelectorAll('li').length).toBe(0);
    fixture.componentRef.setInput('equipamentos', null); fixture.detectChanges();
    expect(el.textContent).toContain('Informação de equipamentos não disponível');
    expect(el.textContent).not.toContain('Nenhum equipamento cadastrado');
  });
});
