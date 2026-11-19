import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Disciplina } from '../../../../models/profile.model';

@Component({
  selector: 'aside[appResumoDisciplinas]',
  templateUrl: './resumo-disciplinas.html',
  styleUrl: './resumo-disciplinas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumoDisciplinas {
  readonly disciplinas = input.required<readonly (Disciplina & { tipo: string })[]>();
  readonly totais = input.required<{ regular: number; dp: number; adiantamento: number }>();
  readonly salvando = input.required<boolean>();
  readonly remover = output<string>();
}
