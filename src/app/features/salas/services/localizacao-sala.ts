/** Reconhece o auditório pelo nome/tipo ou pelo código usado no cadastro Java. */
export function ehAuditorio(nome: string, tipo?: string): boolean {
  const descricao = `${nome} ${tipo ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // O Java também cadastra o Auditório como AUD-01, com o tipo genérico Sala.
  return /\bauditorio\b/i.test(descricao) || /^AUD(?:[\s_-]*\d+)?$/i.test(nome.trim());
}

/** Localização confirmada pelo usuário: salas no Prédio 1; Auditório separado. */
export function predioDaSala(nome: string, tipo?: string): string | undefined {
  return ehAuditorio(nome, tipo) ? undefined : 'Prédio 1';
}
