import { FigmaIcon } from '../../shared/components/figma-icon/figma-icon';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProfessoresService } from './services/professores';
import { IdProfessor, ItemProfessor } from './models/professor';
// TEMPORÁRIO: complemento do catálogo existente, como em Salas.
import { ProfessoresLocaisService } from './services/professores-locais';

@Component({
    selector: 'app-professores',
    standalone: true,
    imports: [RouterLink, FigmaIcon],
    providers: [ProfessoresService, ProfessoresLocaisService],
    templateUrl: './professores.html',
    styleUrl: './professores.scss',
})
export class Professores {
    protected readonly dados = inject(ProfessoresService);
    private readonly route = inject(ActivatedRoute, { optional: true });
    private readonly router = inject(Router, { optional: true });
    private entradaAtiva = false;
    protected readonly mensagemVazia = computed(() => {
        const termo = this.dados.termoBusca().trim();
        return termo ? `Nenhum professor encontrado para "${termo}".`
            : 'Nenhum professor encontrado para os filtros selecionados.';
    });

    constructor() {
        this.route?.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
            const parametro = params.get('professor');
            if (parametro !== null || this.entradaAtiva) this.dados.abrirPelaRota(parametro);
            this.entradaAtiva = parametro !== null;
        });
        this.dados.carregar();
    }

    protected onBuscar(event: Event): void {
        this.dados.buscar((event.target as HTMLInputElement).value);
        this.atualizarEntrada(null);
    }
    protected onFiltrarCurso(event: Event): void {
        const valor = (event.target as HTMLSelectElement).value;
        const curso = this.dados.cursos().find(c => String(c.id) === valor);
        this.dados.selecionarCurso(curso?.id ?? null);
        this.atualizarEntrada(null);
    }
    protected onSelecionarProfessor(id: IdProfessor): void {
        const entradaPorRota = this.dados.entradaPorRota() !== null;
        this.dados.selecionarProfessor(id);
        // A seleção comum mantém a busca e o curso; só atualiza uma entrada direta já ativa.
        this.atualizarEntrada(entradaPorRota ? String(id) : null);
    }

    private atualizarEntrada(professor: string | null): void {
        if (this.route?.routeConfig && this.router) {
            void this.router.navigate([], { relativeTo: this.route, queryParams: { professor },
                queryParamsHandling: 'merge', replaceUrl: true });
        }
    }
    protected ehAula(item: ItemProfessor): item is Extract<ItemProfessor, { tipo: 'aula' }> {
        return item.tipo === 'aula';
    }
    protected iniciais(nome: string): string {
        return nome.trim().split(/\s+/).map(parte => parte[0]).join('').toUpperCase().slice(0, 2);
    }
}
