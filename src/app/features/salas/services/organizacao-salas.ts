import { Injectable, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, defer, map, of, startWith, switchMap, take } from 'rxjs';
import { SessionService, obterTokenSessao } from '../../../core/services/session.service';
import { CARREGAR_GRADE_SEMANAL } from '../../horarios/services/grade-semanal-source';
import { SalaResumo } from '../models/sala-resumo';
import { codigoSala } from './salas-locais';

/** A grade pessoal organiza a listagem; não define a ocupação das salas. */
@Injectable()
export class OrganizacaoSalasService {
  private readonly fonte = inject(CARREGAR_GRADE_SEMANAL, { optional: true });
  private readonly sessao = inject(SessionService);
  private readonly comparador = new Intl.Collator('pt-BR', {
    numeric: true, sensitivity: 'base', ignorePunctuation: true,
  });
  private readonly codigos = toSignal(toObservable(this.sessao.usuario).pipe(
    switchMap(() => defer(() => {
      const token = obterTokenSessao();
      return (this.fonte ? this.fonte() : of([])).pipe(
        take(1),
        map(alocacoes => token === obterTokenSessao() && Array.isArray(alocacoes)
          ? alocacoes.flatMap(aula => aula?.sala?.codigo?.trim() ? [codigoSala(aula.sala.codigo)] : []) : []),
      );
    }).pipe(startWith([] as string[]), catchError(() => of([] as string[])))),
  ), { initialValue: [] as string[] });

  agrupar(salas: SalaResumo[]): { titulo: string | null; salas: SalaResumo[] }[] {
    const ordenadas = [...salas].sort((a, b) => this.comparador.compare(a.nome, b.nome));
    const pessoais = new Set(this.codigos());
    // Sem a grade pessoal confirmada, mostrar o cadastro sem atribuir salas ao aluno.
    if (!pessoais.size) return ordenadas.length ? [{ titulo: null, salas: ordenadas }] : [];
    return [
      { titulo: 'Suas salas', salas: ordenadas.filter(sala => pessoais.has(codigoSala(sala.nome))) },
      { titulo: 'Outras salas', salas: ordenadas.filter(sala => !pessoais.has(codigoSala(sala.nome))) },
    ].filter(grupo => grupo.salas.length);
  }
}
