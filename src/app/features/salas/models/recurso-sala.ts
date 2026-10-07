/** Contrato RecursoSalaResponse: quantidade é inventário, não disponibilidade. */
export interface RecursoSalaApi {
  id: number;
  sala: { id: number };
  recurso: { id: number; nome: string; tipo: { id: number; nome: string } };
  quantidade: number;
}
