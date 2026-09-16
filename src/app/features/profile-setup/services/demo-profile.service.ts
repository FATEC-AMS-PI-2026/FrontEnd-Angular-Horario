/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend.
 * Dados e progresso locais para demonstrar primeiro acesso e reentrada sem API.
 */
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CursoDetalhes, PerfilResponse } from '../models/profile.model';

interface EstadoDemo {
  token: string;
  perfil: PerfilResponse;
  periodoConfirmado: boolean;
}

@Injectable({ providedIn: 'root' })
export class DemoProfileService {
  private readonly storageKey = 'gini_demo_perfil';
  readonly token = 'gini-demo-local-sem-validade-no-backend';
  readonly cursos: CursoDetalhes[] = [
    {
      id: 'demo-ads-manha', title: 'Análise e Desenvolvimento de Sistemas',
      period: 'Período: Manhã', unit: 'Fatec Itu', type: 'Tecnólogo', category: 'Manhã',
      icon: 'code', periodos: ['1º período', '2º período', '3º período', '4º período', '5º período', '6º período'],
      cargaHoraria: 2400, duracaoSemestres: 6, coordenador: null,
    },
    {
      id: 'demo-ads-tarde', title: 'Análise e Desenvolvimento de Sistemas',
      period: 'Período: Tarde (AMS)', unit: 'Fatec Itu', type: 'Tecnólogo', category: 'Tarde',
      icon: 'code', periodos: ['1º período', '2º período', '3º período', '4º período'],
      cargaHoraria: 2000, duracaoSemestres: 4, coordenador: null,
    },
  ];

  get habilitado(): boolean { return !environment.production && environment.demoAuth; }
  get sessaoDemonstrativa(): boolean { return localStorage.getItem('gini_token') === this.token; }
  get ativo(): boolean { return this.habilitado && this.sessaoDemonstrativa; }

  iniciar(primeiroAcesso: boolean): PerfilResponse {
    const curso = this.cursos[0];
    const perfil: PerfilResponse = {
      usuario: {
        nome: primeiroAcesso ? 'Demonstração de primeiro acesso' : 'Demonstração de reentrada',
        email: primeiroAcesso ? 'primeiro@gini.local' : 'demo@gini.local',
        curso: primeiroAcesso ? '' : curso.title,
        periodo: primeiroAcesso ? '' : '2º período',
      },
      configuracaoInicialConcluida: !primeiroAcesso,
      cursoId: primeiroAcesso ? null : curso.id,
      disciplinasIds: [],
    };
    this.salvar({ token: this.token, perfil, periodoConfirmado: false });
    return perfil;
  }

  restaurar(): EstadoDemo {
    if (!this.ativo) throw new Error('Demonstração indisponível.');
    const estado: EstadoDemo | null = JSON.parse(localStorage.getItem(this.storageKey) ?? 'null');
    if (!estado || estado.token !== this.token || !estado.perfil?.usuario ||
        typeof estado.periodoConfirmado !== 'boolean') {
      throw new Error('Entre novamente na conta de demonstração.');
    }
    return estado;
  }

  escolher(cursoId: string | null, periodo: string | null): void {
    const estado = this.restaurar();
    const curso = this.cursos.find(item => item.id === cursoId);
    estado.perfil = { ...estado.perfil, cursoId, usuario: {
      ...estado.perfil.usuario, curso: curso?.title ?? '', periodo: periodo ?? '',
    } };
    this.salvar(estado);
  }

  confirmar(cursoId: string | null, periodo: string | null): PerfilResponse {
    const curso = this.cursos.find(item => item.id === cursoId);
    if (!curso || !periodo || !curso.periodos.includes(periodo)) {
      throw new Error('Selecione um curso e período disponíveis.');
    }
    this.escolher(cursoId, periodo);
    const estado = this.restaurar();
    estado.perfil.configuracaoInicialConcluida = true;
    estado.periodoConfirmado = true;
    this.salvar(estado);
    return estado.perfil;
  }

  private salvar(estado: EstadoDemo): void {
    localStorage.setItem(this.storageKey, JSON.stringify(estado));
  }
}
