import { SalaResumo } from '../models/sala-resumo';
import { DisponibilidadeSala } from './disponibilidade-sala';

/** Terminologia da agenda conforme o uso do espaço, sem criar agendamentos. */
export function rotulosAgendaDaSala(sala?: Pick<SalaResumo, 'nome' | 'tipo'>) {
  const nome = sala?.nome.trim() ?? '';
  const descricao = `${nome} ${sala?.tipo ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\bauditorio\b/i.test(descricao) || /^AUD(?:[\s_-]*\d+)?$/i.test(nome)) {
    return {
      titulo: 'Eventos neste auditório hoje', carregando: 'Carregando eventos de hoje...',
      vazio: 'Nenhum evento cadastrado para este auditório hoje.',
      proximosVazio: 'Nenhum outro evento cadastrado para este auditório hoje.',
      livre: 'Livre — sem mais eventos hoje',
    };
  }
  if (/\breuni(?:ao|oes)\b/i.test(descricao) || /^REUN(?:[\s_-]*\d+)?$/i.test(nome)) {
    return {
      titulo: 'Reuniões nesta sala hoje', carregando: 'Carregando reuniões de hoje...',
      vazio: 'Nenhuma reunião cadastrada para esta sala hoje.',
      proximosVazio: 'Nenhuma outra reunião cadastrada para esta sala hoje.',
      livre: 'Livre — sem mais reuniões hoje',
    };
  }
  return {
    titulo: 'Aulas nesta sala hoje', carregando: 'Carregando aulas de hoje...',
    vazio: 'Nenhuma aula cadastrada para esta sala hoje.',
    proximosVazio: 'Nenhuma outra aula cadastrada para esta sala hoje.',
    livre: 'Livre — sem mais aulas hoje',
  };
}

export function disponibilidadeComRotulo(sala: SalaResumo, disponibilidade?: DisponibilidadeSala): DisponibilidadeSala | undefined {
  return disponibilidade?.texto === 'Livre — sem mais aulas hoje'
    ? { ...disponibilidade, texto: rotulosAgendaDaSala(sala).livre } : disponibilidade;
}
