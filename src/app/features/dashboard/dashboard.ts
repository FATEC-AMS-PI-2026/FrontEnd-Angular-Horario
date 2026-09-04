import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  // Informações do Usuário e Banner
  userName = 'Fulano';
  courseInfo = 'ADS 3º período';
  currentDay = 'Segunda-feira';
  currentTime = '13:20';
  nextClass = 'Projeto Integrador I';

  // Cards Superiores
  stats = [
    { title: 'Aulas hoje', value: '6', subtitle: 'Segunda-feira' },
    { title: 'Professores', value: '4', subtitle: 'Neste período' },
    { title: 'Próxima aula', value: '15:10', subtitle: 'Banco de Dados' },
    { title: 'Aula em andamento', value: '13:20', subtitle: 'Projeto Integrador I' }
  ];

  // Grade de Horários de Hoje
  schedule = [
    { type: 'class', start: '13:20', end: '14:10', subject: 'Projeto Integrador I', prof: 'Prof. Glauco Todesco' },
    { type: 'class', start: '14:10', end: '15:00', subject: 'Projeto Integrador I', prof: 'Prof. Glauco Todesco' },
    { type: 'interval', label: 'Intervalo' },
    { type: 'class', start: '15:10', end: '16:00', subject: 'Banco de Dados', prof: 'Prof. Renato' },
    { type: 'class', start: '16:00', end: '16:50', subject: 'Banco de Dados', prof: 'Prof. Renato' },
    { type: 'interval', label: 'Intervalo' },
    { type: 'class', start: '17:00', end: '17:50', subject: 'Interação Humano-Computador', prof: 'Prof. Renato' },
    { type: 'class', start: '17:50', end: '18:40', subject: 'Interação Humano-Computador', prof: 'Prof. Renato' }
  ];

  // Status das Salas
  roomStatus = [
    { room: 'LAB 01', prof: 'Prof. Glauco Todesco', status: 'livre', label: 'Livre' },
    { room: 'LAB 02', prof: 'Prof. Glauco Todesco', status: 'em_uso', label: 'Em uso' },
    { room: 'LAB 03', prof: 'Prof. Glauco Todesco', status: 'manutencao', label: 'Manutenção' }
  ];

  // Salas de Hoje
  todayRooms = [
    { location: 'Lab. 03 - Prédio 4 | Andar 3', subject: 'Projeto Integrador I' },
    { location: 'Lab. 01 - Prédio 4 | Andar 3', subject: 'Banco de Dados' }
  ];
}