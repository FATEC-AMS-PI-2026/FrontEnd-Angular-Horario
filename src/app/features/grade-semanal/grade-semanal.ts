import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Aula {
  materia: string;
  cor: string;
}

@Component({
  selector: 'app-grade-semanal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grade-semanal.html',
  styleUrl: './grade-semanal.scss'
})
export class GradeSemanal {
  protected readonly horarios = [
    '13:20 14:10', // Aula 1
    '14:10 15:00', // Aula 2
    '15:00 15:10', // Intervalo 1
    '15:10 16:00', // Aula 3
    '16:00 16:50', // Aula 4
    '16:50 17:00', // Intervalo 2
    '17:00 17:50', // Aula 5
    '17:50 18:40'  // Aula 6
  ];

  protected readonly grade: Aula[][] = [
    [{ materia: 'Projeto Integrador I', cor: 'pi' }, { materia: 'Banco de Dados', cor: 'bd' }, { materia: 'Estrutura de Dados', cor: 'ed' }, { materia: 'Programação Mobile', cor: 'pm' }, { materia: 'Projeto Integrador I', cor: 'pi' }],
    [{ materia: 'Projeto Integrador I', cor: 'pi' }, { materia: 'Banco de Dados', cor: 'bd' }, { materia: 'Estrutura de Dados', cor: 'ed' }, { materia: 'Programação Mobile', cor: 'pm' }, { materia: 'Projeto Integrador I', cor: 'pi' }],

    [{ materia: 'Banco de Dados', cor: 'bd' }, { materia: 'IHC', cor: 'ihc' }, { materia: 'Programação Mobile', cor: 'pm' }, { materia: 'Desenvolvimento de Software', cor: 'ds' }, { materia: 'Estrutura de Dados', cor: 'ed' }],
    [{ materia: 'Banco de Dados', cor: 'bd' }, { materia: 'IHC', cor: 'ihc' }, { materia: 'Programação Mobile', cor: 'pm' }, { materia: 'Desenvolvimento de Software', cor: 'ds' }, { materia: 'Estrutura de Dados', cor: 'ed' }],

    [{ materia: 'IHC', cor: 'ihc' }, { materia: 'Desenvolvimento de Software', cor: 'ds' }, { materia: 'Projeto Integrador I', cor: 'pi' }, { materia: 'Banco de Dados', cor: 'bd' }, { materia: 'IHC', cor: 'ihc' }],
    [{ materia: 'IHC', cor: 'ihc' }, { materia: 'Desenvolvimento de Software', cor: 'ds' }, { materia: 'Projeto Integrador I', cor: 'pi' }, { materia: 'Banco de Dados', cor: 'bd' }, { materia: 'IHC', cor: 'ihc' }]
  ];

  formatarHorario(horario: string | undefined): string[] {
    if (!horario) return ['', ''];
    return horario.split(' ');
  }

  obterClasseCor(cor: string): string {
    return `cor-${cor}`;
  }
}
