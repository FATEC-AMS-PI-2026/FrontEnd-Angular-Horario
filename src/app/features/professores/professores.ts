import { Component, computed, inject } from '@angular/core';
import { ProfessoresService } from './services/professores';
import { ItemProfessor } from './models/professor';
// TEMPORÁRIO: complemento do catálogo existente, como em Salas.
import { ProfessoresLocaisService } from './services/professores-locais';

@Component({
    selector: 'app-professores',
    standalone: true,
    providers: [ProfessoresService, ProfessoresLocaisService],
    templateUrl: './professores.html',
    styleUrl: './professores.scss',
})
export class Professores {
    protected readonly dados = inject(ProfessoresService);
    protected readonly mensagemVazia = computed(() => {
        const termo = this.dados.termoBusca().trim();
        return termo ? `Nenhum professor encontrado para "${termo}".`
            : 'Nenhum professor encontrado para os filtros selecionados.';
    });

    constructor() { this.dados.carregar(); }

    protected onBuscar(event: Event): void {
        this.dados.buscar((event.target as HTMLInputElement).value);
    }
    protected onFiltrarCurso(event: Event): void {
        const valor = (event.target as HTMLSelectElement).value;
        const curso = this.dados.cursos().find(c => String(c.id) === valor);
        this.dados.selecionarCurso(curso?.id ?? null);
    }
    protected ehAula(item: ItemProfessor): item is Extract<ItemProfessor, { tipo: 'aula' }> {
        return item.tipo === 'aula';
    }
    protected iniciais(nome: string): string {
        return nome.trim().split(/\s+/).map(parte => parte[0]).join('').toUpperCase().slice(0, 2);
    }
}
