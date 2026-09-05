import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sala } from '../../models/sala';
import { StatusSalaBadge } from '../status-sala-badge';

/**
 * Cabeçalho da página de detalhes da sala. Cobre a issue "WEB: Header e
 * informações gerais da sala" (#7): breadcrumb "Salas / [Nome da Sala]",
 * nome da sala, badges de prédio/andar/tipo/status, capacidade e nome do
 * técnico responsável (resumo — os dados completos do técnico continuam no
 * `TecnicoCard`, issue #49), botão para voltar à listagem e botão "Ver
 * alertas" que abre o `AlertasModal` (issue #13).
 *
 * Consolida o que antes estava espalhado direto em `DetalhesSala` (o link
 * de voltar e o `<dl>` de prédio/andar/tipo/capacidade), seguindo o mesmo
 * padrão de componentização já usado em `EquipamentosCard` (issue #69).
 */
@Component({
  selector: 'app-cabecalho-sala',
  imports: [RouterLink, StatusSalaBadge],
  templateUrl: './cabecalho-sala.html',
  styleUrl: './cabecalho-sala.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabecalhoSala {
  readonly sala = input.required<Sala>();

  /** Emitido quando o usuário clica em "Ver alertas". */
  readonly verAlertas = output<void>();
}
