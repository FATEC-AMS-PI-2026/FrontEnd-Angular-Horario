import { Component, input } from '@angular/core';
import { Tecnico } from '../../models/tecnico';
/**
 * Card com as informações do técnico responsável pela sala. Cobre os
 * critérios de aceite da issue #49: nome, função, horário e dias de
 * atendimento, carregados dinamicamente a partir da sala selecionada.
 */
@Component({
  selector: 'app-tecnico-card',
  templateUrl: './tecnico-card.html',
  styleUrl: './tecnico-card.scss',
})
export class TecnicoCard {
  readonly tecnico = input.required<Tecnico>();
}
