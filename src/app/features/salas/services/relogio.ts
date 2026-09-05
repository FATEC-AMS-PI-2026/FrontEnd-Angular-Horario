import { Injectable } from '@angular/core';

/**
 * Fonte única do horário atual, usada para destacar a aula em andamento no
 * `AulasDoDiaCard` (issue #12). Existe como serviço injetável — em vez de
 * chamar `new Date()` direto no componente — para que o "agora" possa ser
 * substituído em testes sem depender do relógio real da máquina.
 */
@Injectable({ providedIn: 'root' })
export class RelogioService {
  agora(): Date {
    return new Date();
  }
}
