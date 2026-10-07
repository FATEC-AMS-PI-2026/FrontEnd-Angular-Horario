import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { HorariosService } from '../horarios/services/horarios';
import { AulaHorario } from '../horarios/models/item-horario';

export const PROFESSOR_A_DEFINIR = 'Professor a definir';

/** A página só apresenta a matriz e as cores fornecidas pelo Service. */
@Component({
    selector: 'app-grade-semanal',
    standalone: true,
    templateUrl: './grade-semanal.html',
    styleUrl: './grade-semanal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeSemanal implements OnInit {
    protected readonly horariosService = inject(HorariosService);
    protected readonly dias = this.horariosService.dias;
    protected readonly linhas = this.horariosService.linhas;

    ngOnInit(): void { this.horariosService.carregar(); }

    protected professorDe(aula: AulaHorario): string {
        return aula.professor?.trim() || PROFESSOR_A_DEFINIR;
    }

    protected temProfessor(aula: AulaHorario): boolean {
        return !!aula.professor?.trim();
    }
}
