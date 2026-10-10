// TEMPORÁRIO: remover este adaptador quando o catálogo local for substituído pelo Java.
import { Injectable, computed, inject, signal } from '@angular/core';
import { DadosLocaisService } from '../../dados-locais/services/dados-locais.service';
import { CatalogoLocal } from '../../dados-locais/models/catalogo-local';
import { SalaResumo } from '../models/sala-resumo';
import { AulaDoDia } from '../models/aula-do-dia';
import { dataAcademica, diaSemana } from '../../dashboard/models/grade-dia.model';
import { ApiErrorService } from '../../../core/services/api-error.service';
import { predioDaSala } from './localizacao-sala';

/** Ignora apenas diferenças de separação. Preserva zeros e frações, como Sala 9¾. */
export const codigoSala = (codigo: string) => codigo.trim().toLocaleUpperCase('pt-BR').replace(/[\s-]+/g, '');

export function unirSalas(remotas: SalaResumo[], locais: SalaResumo[]): SalaResumo[] {
  const codigos = new Set(remotas.map(s => codigoSala(s.nome)));
  return [...remotas, ...locais.filter(s => !codigos.has(codigoSala(s.nome)))];
}

export function aulasLocaisDaSala(c: CatalogoLocal | null, codigo: string, agora: Date): AulaDoDia[] {
  if (!c) return [];
  const salas = c.salas.filter(s => codigoSala(s.codigo) === codigoSala(codigo));
  const data = dataAcademica(agora);
  if (salas.length !== 1 || !c.vigenciaInicio || !c.vigenciaFim || data < c.vigenciaInicio || data > c.vigenciaFim ||
      c.calendario?.semAula.some(s => s.inicio <= data && data <= s.fim)) return [];
  return c.alocacoes.filter(a => a.salaId === salas[0].id).flatMap(a => {
    const oferta = c.ofertas.find(o => o.id === a.ofertaId);
    const turma = c.turmas.find(t => t.id === oferta?.turmaId);
    const disciplina = c.disciplinas.find(d => d.id === oferta?.disciplinaId);
    const reposicao = c.calendario?.reposicoes.find(r => r.data === data && r.turno === turma?.turno);
    if (!turma || !disciplina || a.diaSemana !== (reposicao?.diaSemana ?? diaSemana(data))) return [];
    return [{ inicio: a.horaInicio, termino: a.horaFim, disciplina: disciplina.nome,
      turma: turma.codigo, professor: c.professores.find(p => p.id === a.professorId)?.nome,
      origem: 'local' as const }];
  }).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

@Injectable({ providedIn: 'root' })
export class SalasLocaisService {
  private readonly dados = inject(DadosLocaisService);
  private readonly erros = inject(ApiErrorService);
  readonly catalogo = signal<CatalogoLocal | null>(null);
  readonly erro = signal<string | null>(null);
  readonly carregando = signal(true);
  readonly salas = computed<SalaResumo[]>(() => this.catalogo()?.salas.map(s => ({
    id: s.id, nome: s.codigo, rotaId: `local-${s.id}`, origem: 'local', predio: predioDaSala(s.codigo),
  })) ?? []);

  constructor() { this.carregar(); }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.dados.catalogo().then(salvo => this.catalogo.set(salvo?.catalogo ?? null))
      .catch(erro => this.erro.set(this.erros.mensagem(erro, 'Não foi possível consultar os dados deste navegador.')))
      .finally(() => this.carregando.set(false));
  }
}
