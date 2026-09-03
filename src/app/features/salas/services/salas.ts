import { Injectable, signal } from '@angular/core';
import { Sala } from '../models/sala';

/**
 * Dados de exemplo enquanto o endpoint de salas do BackEnd-Java não existe.
 * Quando a API estiver disponível, troque o array abaixo por uma chamada
 * HttpClient (ver TODO em `carregarSalas`).
 */
const SALAS_MOCK: Sala[] = [
  {
    id: 1,
    nome: 'Sala 101',
    predio: 'Bloco A',
    andar: 1,
    capacidade: 40,
    tipo: 'Sala de aula',
    status: 'Livre',
    equipamentos: [
      { tipo: 'Wi-Fi', quantidadeTotal: 1, quantidadeDisponivel: 1 },
      { tipo: 'Televisão', quantidadeTotal: 1, quantidadeDisponivel: 1 },
      { tipo: 'Cadeira', quantidadeTotal: 40, quantidadeDisponivel: 40 },
      { tipo: 'Ar-condicionado', quantidadeTotal: 2, quantidadeDisponivel: 2 },
    ],
    proximosHorarios: [
      { inicio: '08:00', termino: '09:40', atividade: 'Cálculo I', professor: 'Prof. Ricardo Nunes' },
      { inicio: '10:00', termino: '11:40', atividade: 'Algoritmos e Programação' },
      { inicio: '14:00', termino: '15:40', atividade: 'Física Geral', professor: 'Profa. Ana Beatriz' },
    ],
  },
  {
    id: 2,
    nome: 'Laboratório 203',
    predio: 'Bloco B',
    andar: 2,
    capacidade: 30,
    tipo: 'Laboratório de informática',
    status: 'Em uso',
    equipamentos: [
      { tipo: 'Wi-Fi', quantidadeTotal: 1, quantidadeDisponivel: 1 },
      { tipo: 'Computador', quantidadeTotal: 30, quantidadeDisponivel: 27 },
      { tipo: 'Televisão', quantidadeTotal: 1, quantidadeDisponivel: 0 },
      { tipo: 'Cadeira', quantidadeTotal: 30, quantidadeDisponivel: 30 },
      { tipo: 'Ar-condicionado', quantidadeTotal: 1, quantidadeDisponivel: 0 },
    ],
    tecnicoResponsavel: {
      nome: 'Carlos Souza',
      funcao: 'Técnico de laboratório',
      horarioAtendimento: '08h às 17h',
      diasAtendimento: 'Segunda a sexta',
    },
    proximosHorarios: [
      { inicio: '09:00', termino: '10:40', atividade: 'Banco de Dados', professor: 'Prof. Marcelo Tadeu' },
      { inicio: '13:00', termino: '14:40', atividade: 'Redes de Computadores', professor: 'Prof. João Pedro' },
    ],
  },
  {
    id: 3,
    nome: 'Sala 305',
    predio: 'Bloco A',
    andar: 3,
    capacidade: 25,
    tipo: 'Sala de aula',
    status: 'Manutenção',
    equipamentos: [
      { tipo: 'Wi-Fi', quantidadeTotal: 1, quantidadeDisponivel: 0 },
      { tipo: 'Cadeira', quantidadeTotal: 25, quantidadeDisponivel: 25 },
    ],
    // Sala em manutenção: sem horários agendados, testa o estado vazio do
    // card de próximos horários.
    proximosHorarios: [],
  },
];

@Injectable({ providedIn: 'root' })
export class SalasService {
  private readonly salasSignal = signal<Sala[]>(SALAS_MOCK);

  /** Lista reativa de salas, pronta para ser usada em templates com signals. */
  readonly salas = this.salasSignal.asReadonly();

  obterSalaPorId(id: number): Sala | undefined {
    return this.salasSignal().find((sala) => sala.id === id);
  }

  // TODO(integração backend): quando a rota REST de salas existir no
  // BackEnd-Java, injetar HttpClient aqui e substituir o mock por algo como:
  //
  //   private readonly http = inject(HttpClient);
  //
  //   carregarSalas(): void {
  //     this.http.get<Sala[]>('/api/salas').subscribe((salas) => this.salasSignal.set(salas));
  //   }
  //
  // O restante do código (componentes de lista/detalhe/badge) não muda,
  // porque eles só dependem do signal `salas` e de `obterSalaPorId`.
}