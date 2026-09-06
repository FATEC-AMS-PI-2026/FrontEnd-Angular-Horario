/**
 * Origem do alerta: equipamento com problema, manutenção agendada/pendente
 * na sala, ou outro tipo não coberto pelos anteriores. Cobre o critério de
 * aceite "Listar todos os alertas ativos (equipamentos, manutenção, etc.)"
 * da issue "WEB: Modal/página de alertas da sala" (#13).
 */
export type TipoAlerta = 'Equipamento' | 'Manutenção' | 'Outro';

/**
 * Um alerta ativo (ou já resolvido) de uma sala, exibido no modal da issue
 * #13. Diferente do banner da issue "WEB: Alertas de equipamentos da sala"
 * (#43) — que é calculado na hora a partir da lista de `Equipamento` da
 * sala — um `Alerta` é uma entidade própria, com identidade (`id`), data de
 * abertura e estado de resolução, porque pode ser marcado como resolvido
 * pelo usuário sem que isso altere o estoque de equipamentos.
 */
export interface Alerta {
  id: number;
  tipo: TipoAlerta;
  /** Mensagem descrevendo o problema (ex.: "Ar-condicionado indisponível"). */
  mensagem: string;
  /** Data/hora em que o alerta foi aberto. */
  abertoEm: Date;
  /** `true` quando o alerta já foi tratado e marcado como resolvido. */
  resolvido: boolean;
}
