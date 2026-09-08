import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ListaSalas } from './lista-salas';

describe('ListaSalas', () => {
  let fixture: ComponentFixture<ListaSalas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaSalas],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaSalas);
    fixture.detectChanges();
  });

  it('mantém o select de prédios e combina-o com o filtro por tipo em botões', () => {
    const element: HTMLElement = fixture.nativeElement;
    const select = element.querySelector<HTMLSelectElement>('.lista-salas__filtro-predio')!;
    const chips = Array.from(element.querySelectorAll<HTMLButtonElement>('.lista-salas__tipos .filtro-chip'));
    const cards = () => element.querySelectorAll('.card-sala').length;

    expect(select.value).toBe('');
    expect(chips.length).toBe(3);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    expect(cards()).toBe(3);

    select.value = 'Bloco B';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(cards()).toBe(1);

    chips[2].click();
    fixture.detectChanges();

    expect(chips[2].getAttribute('aria-pressed')).toBe('true');
    expect(cards()).toBe(1);
  });

  it('filtra somente salas ao selecionar o botão correspondente', () => {
    const element: HTMLElement = fixture.nativeElement;
    const salas = element.querySelector<HTMLButtonElement>('.lista-salas__tipos .filtro-chip:nth-child(2)')!;

    salas.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.card-sala').length).toBe(2);
    expect(Array.from(element.querySelectorAll('.card-sala__info'))
      .every((card) => card.textContent?.includes('Sala de aula'))).toBeTrue();
  });
});
