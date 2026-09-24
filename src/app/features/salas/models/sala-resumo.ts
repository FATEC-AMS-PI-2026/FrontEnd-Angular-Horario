import { StatusSala } from './sala';

/** `SalaResponse` do backend Java (`GET /salas`). */
export interface SalaApi {
  id: number;
  codigo: string;
  capacidade: number;
  tipoSala: { id: number; nome: string };
}

/**
 * Sala como aparece no card da listagem (issue #132). Só `id`, `nome`,
 * `capacidade` e `tipo` vêm do backend hoje; prédio, andar e status ainda
 * não existem na API e ficam opcionais até a #109 — o card só mostra o que
 * estiver preenchido.
 */
export interface SalaResumo {
  id: number;
  nome: string;
  capacidade: number;
  tipo: string;
  predio?: string;
  andar?: number;
  status?: StatusSala;
}
