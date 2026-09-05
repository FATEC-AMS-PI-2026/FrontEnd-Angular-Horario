import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SalasService } from '../../services/salas';
import { TecnicoCard } from '../../components/tecnico-card/tecnico-card';
import { EquipamentosCard } from '../../components/equipamentos-card/equipamentos-card';
import { ProximosHorariosCard } from '../../components/proximos-horarios-card/proximos-horarios-card';
import { CabecalhoSala } from '../../components/cabecalho-sala/cabecalho-sala';
import { AlertasModal } from '../../components/alertas-modal/alertas-modal';

/**
 * Página de detalhes de uma sala. Cobre a issue #67: chegar aqui a partir da
 * lista, exibir os dados da sala selecionada e voltar para a lista sem
 * perder o estado da aplicação (navegação via Router, sem reload de página).
 *
 * Também cobre a issue #49: exibir o card do técnico responsável quando a
 * sala tiver um cadastrado.
 *
 * A exibição dos equipamentos (issues #61 e #69) foi extraída para o
 * componente `EquipamentosCard`, reutilizável em outras telas.
 *
 * Também cobre a issue #44: exibir os próximos horários de utilização da
 * sala, em ordem cronológica.
 *
 * Também cobre a issue #7: o cabeçalho (breadcrumb, nome, badges, botão de
 * voltar e botão "Ver alertas") foi extraído para `CabecalhoSala`.
 *
 * Também cobre a issue #13: o botão "Ver alertas" do cabeçalho abre o
 * `AlertasModal`, que lista os alertas da sala e permite marcá-los como
 * resolvidos.
 */
@Component({
  selector: 'app-detalhes-sala',
  standalone: true,
  imports: [RouterLink, CabecalhoSala, TecnicoCard, EquipamentosCard, ProximosHorariosCard, AlertasModal],
  templateUrl: './detalhes-sala.html',
  styleUrl: './detalhes-sala.scss',
})
export class DetalhesSala {
  private readonly route = inject(ActivatedRoute);
  private readonly salasService = inject(SalasService);

  private readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: NaN },
  );

  protected readonly sala = computed(() => this.salasService.obterSalaPorId(this.id()));

  /** Controla a visibilidade do `AlertasModal` (issue #13). */
  protected readonly alertasAbertos = signal(false);

  protected abrirAlertas(): void {
    this.alertasAbertos.set(true);
  }

  protected fecharAlertas(): void {
    this.alertasAbertos.set(false);
  }

  protected resolverAlerta(alertaId: number): void {
    const salaAtual = this.sala();
    if (salaAtual) {
      this.salasService.marcarAlertaComoResolvido(salaAtual.id, alertaId);
    }
  }
}