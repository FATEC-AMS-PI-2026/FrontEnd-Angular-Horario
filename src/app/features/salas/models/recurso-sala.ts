/** `RecursoSalaResponse` do backend Java (`GET /recurso-sala?salaId=`). */
export interface RecursoSalaApi {
  id: number;
  quantidade: number;
  sala?: { id: number } | null;
  recurso: { id: number; nome: string; tipo?: { id: number; nome: string } | null };
}

/**
 * Recurso cadastrado numa sala (issue #149). O backend só informa nome, tipo
 * (Equipamento, Mobiliário...) e quantidade total; não há quantidade disponível,
 * então a tela não pinta verde/amarelo/vermelho para esses itens.
 */
export interface RecursoSala {
  nome: string;
  tipo: string | null;
  quantidade: number;
}
