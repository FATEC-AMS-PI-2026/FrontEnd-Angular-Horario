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
 * não existem no contrato Java consultado na #109. Permanecem opcionais;
 * os cards só mostram localização conhecida e calculam ocupação pela agenda global.
 */
export interface SalaResumo {
  id: number;
  nome: string;
  capacidade?: number;
  tipo?: string;
  /** IDs das fontes são independentes; salas exclusivas do navegador usam local-{id}. */
  rotaId?: string;
  origem?: 'local' | 'java';
  predio?: string;
  andar?: number;
  status?: StatusSala;
}
