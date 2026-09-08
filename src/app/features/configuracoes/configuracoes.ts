import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PreferencesService } from '../../core/services/preferences.service';
import { SessionService } from '../../core/services/session.service';
import { SettingsSearchService } from '../../core/services/settings-search.service';
import { FigmaIcon } from '../../shared/components/figma-icon/figma-icon';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-configuracoes',
  imports: [RouterLink, FigmaIcon],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.scss',
})
export class Configuracoes implements OnDestroy {
  protected readonly session = inject(SessionService);
  protected readonly preferences = inject(PreferencesService);
  protected readonly busca = inject(SettingsSearchService);
  protected readonly links = environment.linksSistema;
  protected readonly documento = signal('');
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  protected readonly geraisVisiveis = computed(() => this.busca.corresponde(
    'Configurações gerais Alterar senha Relatar problema Notificações Modo Escuro Sair da Conta',
  ));
  protected readonly contaVisivel = computed(() => this.busca.corresponde(
    `Conta ${this.session.usuario()?.nome ?? ''} ${this.session.usuario()?.email ?? ''} ${this.session.identificacao()}`,
  ));
  protected readonly sobreVisivel = computed(() => this.busca.corresponde(
    'Sobre o sistema Privacidade e Segurança Termos de uso',
  ));

  protected mostrarDocumentoPendente(titulo: string): void {
    this.documento.set(titulo);
    this.dialogo().nativeElement.showModal();
  }

  ngOnDestroy(): void {
    this.busca.termo.set('');
  }
}
