import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HorariosService } from '../horarios/services/horarios';
import { AulaHorario, PROFESSOR_A_DEFINIR } from '../horarios/models/item-horario';
import { InformacoesMateriaModal } from './components/informacoes-materia-modal/informacoes-materia-modal';

/** Mantido aqui por compatibilidade; a fonte é `item-horario.ts` (#150). */
export { PROFESSOR_A_DEFINIR };

/** A matriz e as informações de cada aula vêm do Service. */
@Component({
    selector: 'app-grade-semanal',
    standalone: true,
    imports: [InformacoesMateriaModal],
    templateUrl: './grade-semanal.html',
    styleUrl: './grade-semanal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeSemanal implements OnInit {
    protected readonly horariosService = inject(HorariosService);
    protected readonly dias = this.horariosService.dias;
    protected readonly linhas = this.horariosService.linhas;
    protected readonly aulaSelecionada = signal<AulaHorario | null>(null);
    private botaoOrigem: HTMLElement | null = null;

    ngOnInit(): void { this.horariosService.carregar(); }

    protected abrirInformacoes(aula: AulaHorario, evento: Event): void {
        this.botaoOrigem = evento.currentTarget as HTMLElement;
        // Preserva a aula clicada, inclusive quando a matéria se repete na semana.
        this.aulaSelecionada.set(aula);
    }

    protected fecharInformacoes(): void {
        this.aulaSelecionada.set(null);
        if (this.botaoOrigem?.isConnected) this.botaoOrigem.focus();
        this.botaoOrigem = null;
    }

    protected professorDe(aula: AulaHorario): string {
        return aula.professor?.trim() || PROFESSOR_A_DEFINIR;
    }

    protected temProfessor(aula: AulaHorario): boolean {
        return !!aula.professor?.trim();
    }
}
