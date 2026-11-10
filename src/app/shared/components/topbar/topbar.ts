import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { TopbarContextService } from '../../../core/services/topbar-context.service';
import { NOME_APLICACAO, TituloPaginaService } from '../../../core/services/titulo-pagina.service';
import { SettingsSearchService } from '../../../core/services/settings-search.service';
import { FigmaIcon } from '../figma-icon/figma-icon';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [FigmaIcon, RouterLink],
    templateUrl: './topbar.html',
    styleUrl: './topbar.scss',
})
export class Topbar {
    protected readonly contexto = inject(TopbarContextService);
    protected readonly busca = inject(SettingsSearchService);
    private readonly document = inject(DOCUMENT);
    private readonly titulos = inject(TituloPaginaService);

    /** Vem do `title` da rota ativa (#161); sem título definido, mostra o nome do sistema. */
    readonly title = computed(() => this.titulos.atual() ?? NOME_APLICACAO);

    protected abrirNotificacoes(): void {
        this.busca.termo.set('');
        // Aguarda o card reaparecer caso a busca o tenha ocultado.
        requestAnimationFrame(() => this.document.getElementById('notificacoes')?.focus());
    }
}
