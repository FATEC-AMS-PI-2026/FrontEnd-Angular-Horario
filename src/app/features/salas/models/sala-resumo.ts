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
 * `capacidade` e `tipo` vêm do backend hoje. Prédio segue a localização
 * confirmada pelo usuário: Prédio 1, exceto Auditório. Andar e status ainda
 * não existem no contrato Java consultado na #109; permanecem opcionais.
 * Os cards calculam ocupação pela agenda global.
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
