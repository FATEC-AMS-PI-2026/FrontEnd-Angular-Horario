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
    recursos: ['Projetor', 'Ar-condicionado'],
  },
  {
    id: 2,
    nome: 'Laboratório 203',
    predio: 'Bloco B',
    andar: 2,
    capacidade: 30,
    tipo: 'Laboratório de informática',
    status: 'Em uso',
    recursos: ['30 computadores', 'Projetor', 'Quadro branco'],
  },
  {
    id: 3,
    nome: 'Sala 305',
    predio: 'Bloco A',
    andar: 3,
    capacidade: 25,
    tipo: 'Sala de aula',
    status: 'Manutenção',
    recursos: ['Quadro branco'],
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
