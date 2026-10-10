/** Localização confirmada pelo usuário: salas no Prédio 1; Auditório separado. */
export function predioDaSala(nome: string, tipo?: string): string | undefined {
  const descricao = `${nome} ${tipo ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /\bauditorio\b/i.test(descricao) ? undefined : 'Prédio 1';
}
