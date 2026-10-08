import { AlocacaoResponse } from '../models/grade-dia.model';
import { SalaResumo } from '../../salas/models/sala-resumo';
import { codigoSala } from '../../salas/services/salas-locais';

export interface SalaHoje {
  chave: string;
  codigo: string;
  disciplinas: string;
  sala?: SalaResumo;
}

/** IDs locais e Java são independentes. Só associar um código sem ambiguidade. */
export function mapearSalasHoje(alocacoes: AlocacaoResponse[], cadastro: SalaResumo[]): SalaHoje[] {
  const salas = new Map<string, { codigo: string; disciplinas: Set<string> }>();
  for (const aula of alocacoes) {
    if (!aula.sala) continue;
    const chave = codigoSala(aula.sala.codigo);
    const sala = salas.get(chave) ?? { codigo: aula.sala.codigo, disciplinas: new Set<string>() };
    sala.disciplinas.add(aula.disciplina.nome);
    salas.set(chave, sala);
  }
  return [...salas.entries()].map(([chave, item]) => {
    const correspondentes = cadastro.filter(sala => codigoSala(sala.nome) === chave);
    const sala = correspondentes.length === 1 ? correspondentes[0] : undefined;
    return { chave, codigo: sala?.nome ?? item.codigo, disciplinas: [...item.disciplinas].join(' · '), sala };
  });
}
