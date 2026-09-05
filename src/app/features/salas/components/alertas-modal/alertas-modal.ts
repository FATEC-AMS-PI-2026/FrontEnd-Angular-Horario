import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Alerta } from '../../models/alerta';

/**
 * Enquanto não existe um sistema de autenticação/permissões de verdade (ver
 * `AuthService`), quem pode marcar um alerta como resolvido é decidido por
 * esta constante mockada. TODO(integração backend): trocar por uma
 * verificação real assim que login/perfis existirem (ex.: só técnico ou
 * professor responsável pela sala podem resolver alertas).
 */
const PODE_GERENCIAR_ALERTAS_MOCK = true;

/**
 * Modal com todos os alertas ativos (e já resolvidos) de uma sala. Cobre a
 * issue "WEB: Modal/página de alertas da sala" (#13): lista os alertas
 * (equipamento, manutenção, etc.) com data/hora de abertura, e permite
 * marcar um alerta como resolvido quando o usuário tem permissão.
 *
 * É aberto pelo botão "Ver alertas" do `CabecalhoSala` (issue #7).
 */
@Component({
  selector: 'app-alertas-modal',
  imports: [DatePipe],
  templateUrl: './alertas-modal.html',
  styleUrl: './alertas-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasModal {
  /** Controla se o modal está visível. */
  readonly aberto = input.required<boolean>();

  /** Alertas da sala selecionada (ativos e já resolvidos). */
  readonly alertas = input.required<Alerta[]>();

  /** Emitido quando o usuário pede para fechar o modal. */
  readonly fechar = output<void>();

  /** Emitido com o id do alerta que o usuário marcou como resolvido. */
  readonly resolver = output<number>();

  protected readonly podeGerenciarAlertas = PODE_GERENCIAR_ALERTAS_MOCK;
}
