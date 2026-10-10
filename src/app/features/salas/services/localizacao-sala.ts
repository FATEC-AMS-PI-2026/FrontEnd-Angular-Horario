/** Localização confirmada pelo usuário: salas no Prédio 1; Auditório separado. */
export function predioDaSala(nome: string, tipo?: string): string | undefined {
  const descricao = `${nome} ${tipo ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // O Java também cadastra o Auditório como AUD-01, com o tipo genérico Sala.
  const auditorio = /\bauditorio\b/i.test(descricao) || /^AUD(?:[\s_-]*\d+)?$/i.test(nome.trim());
  return auditorio ? undefined : 'Prédio 1';
}
