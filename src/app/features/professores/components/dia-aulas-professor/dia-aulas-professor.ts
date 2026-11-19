import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DiaProfessor } from '../../models/professor';

@Component({
  selector: 'div[appDiaAulasProfessor]',
  templateUrl: './dia-aulas-professor.html',
  styleUrl: './dia-aulas-professor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaAulasProfessor {
  readonly dia = input.required<DiaProfessor>();
}
