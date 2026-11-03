import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Dashboard } from '../dashboard/dashboard';
import { CARREGAR_GRADE_DIA } from '../dashboard/services/dashboard.service';
import { CARREGAR_GRADE_SEMANAL } from '../horarios/services/grade-semanal-source';
import { HorariosService } from '../horarios/services/horarios';
import { alocacaoTeste } from '../horarios/testing/grade-semanal.fixture';
import { SalaResumo } from '../salas/models/sala-resumo';
import { ConsultaSalasService } from '../salas/services/consulta-salas';
import { RelogioService } from '../salas/services/relogio';
import { GradeSemanal } from './grade-semanal';

/** Payloads exclusivos de teste: os componentes não recebem uma regra de turno. */
const TURNOS = [
  {
    nome: 'Manhã',
    duracao: 45,
    blocos: [
      ['07:00', '07:45'],
      ['07:45', '08:30'],
      ['08:50', '09:35'],
      ['09:35', '10:20'],
    ],
  },
  {
    nome: 'Tarde',
    duracao: 50,
    blocos: [
      ['13:00', '13:50'],
      ['13:50', '14:40'],
      ['15:00', '15:50'],
      ['15:50', '16:40'],
      ['16:40', '17:30'],
    ],
  },
  {
    nome: 'Noite',
    duracao: 35,
    blocos: [
      ['19:00', '19:35'],
      ['19:35', '20:10'],
      ['20:10', '20:45'],
      ['21:00', '21:35'],
      ['21:35', '22:10'],
      ['22:10', '22:45'],
      ['22:45', '23:20'],
    ],
  },
];

describe('Grades dinâmicas por turno (#117)', () => {
  let alocacoes: ReturnType<typeof alocacaoTeste>[];

  function usarTurno(turno: (typeof TURNOS)[number]): void {
    // Ordem invertida para validar também a ordenação feita pelos Services.
    alocacoes = turno.blocos
      .map(([horaInicio, horaFim], indice) =>
        alocacaoTeste({
          id: indice + 1,
          disciplina: { id: indice + 1, nome: `Disciplina ${indice + 1}`, periodo: 1 },
          blocoHorario: { id: indice + 1, horaInicio, horaFim, duracao: turno.duracao },
        }),
      )
      .reverse();
  }

  beforeEach(() => {
    const salas = {
      salas: signal<SalaResumo[]>([]),
      carregando: signal(false),
      erro: signal(null),
      estadoAgenda: signal({ alocacoes: null, carregando: false, erro: null }),
      locais: { erro: signal(null), carregar: () => {} },
      disponibilidade: () => undefined,
      professoresEmAula: () => [],
      tentarNovamente: () => {},
    };
    TestBed.configureTestingModule({
      imports: [GradeSemanal, Dashboard],
      providers: [
        provideRouter([]),
        { provide: CARREGAR_GRADE_SEMANAL, useValue: () => of(alocacoes) },
        { provide: CARREGAR_GRADE_DIA, useValue: () => of(alocacoes) },
        {
          provide: RelogioService,
          useValue: { agora: () => new Date('2026-09-14T06:00:00-03:00') },
        },
      ],
    }).overrideComponent(Dashboard, {
      set: { providers: [{ provide: ConsultaSalasService, useValue: salas }] },
    });
  });

  for (const turno of TURNOS) {
    it(`renderiza ${turno.blocos.length} blocos de ${turno.nome} na matriz e na Dashboard`, () => {
      usarTurno(turno);
      const grade = TestBed.createComponent(GradeSemanal);
      const dashboard = TestBed.createComponent(Dashboard);
      grade.detectChanges();
      dashboard.detectChanges();
      const matriz: HTMLElement = grade.nativeElement;
      const dia: HTMLElement = dashboard.nativeElement;
      const textos = (raiz: HTMLElement, seletor: string) =>
        Array.from(raiz.querySelectorAll(seletor), (elemento) => elemento.textContent?.trim());

      expect(textos(matriz, '.linha:not(.linha-intervalo) .coluna-horario span')).toEqual(
        turno.blocos.flat(),
      );
      expect(textos(dia, '.schedule-item--class .time-block span')).toEqual(turno.blocos.flat());
      expect(matriz.querySelectorAll('.etiqueta-materia').length).toBe(turno.blocos.length);
      expect(dia.querySelectorAll('.schedule-item--class').length).toBe(turno.blocos.length);
      expect(matriz.querySelectorAll('.linha-intervalo').length).toBe(1);
      expect(dia.querySelectorAll('.schedule-item--interval').length).toBe(1);
      expect(matriz.querySelectorAll('.linha .celula').length).toBe((turno.blocos.length + 1) * 5);
      for (const [indice, botao] of Array.from(
        dia.querySelectorAll('.schedule-item--class'),
      ).entries()) {
        expect(botao.textContent).toContain(`Disciplina ${indice + 1}`);
      }
    });
  }

  for (const largura of [390, 1366]) {
    it(`redimensiona as duas grades ao trocar de turno em ${largura}px`, () => {
      usarTurno(TURNOS[2]);
      const grade = TestBed.createComponent(GradeSemanal);
      const dashboard = TestBed.createComponent(Dashboard);
      grade.detectChanges();
      dashboard.detectChanges();
      const matriz: HTMLElement = grade.nativeElement;
      const dia: HTMLElement = dashboard.nativeElement;
      // O TestBed remove o primeiro host ao criar o segundo componente.
      document.body.append(matriz, dia);
      matriz.style.display = dia.style.display = 'block';
      matriz.style.width = dia.style.width = `${largura}px`;
      const alturaGrade = matriz.querySelector('.tabela')!.getBoundingClientRect().height;
      const alturaDia = dia.querySelector('.schedule-list')!.getBoundingClientRect().height;

      usarTurno(TURNOS[0]);
      TestBed.inject(HorariosService).carregar();
      dashboard.componentInstance.carregar();
      grade.detectChanges();
      dashboard.detectChanges();

      expect(matriz.querySelectorAll('.linha').length).toBe(5);
      expect(dia.querySelectorAll('.schedule-item').length).toBe(5);
      expect(matriz.querySelector('.tabela')!.getBoundingClientRect().height).toBeLessThan(
        alturaGrade,
      );
      expect(dia.querySelector('.schedule-list')!.getBoundingClientRect().height).toBeLessThan(
        alturaDia,
      );
      expect(matriz.textContent).not.toContain('19:00');
      expect(dia.querySelector('.schedule-list')!.textContent).not.toContain('19:00');
    });
  }
});
