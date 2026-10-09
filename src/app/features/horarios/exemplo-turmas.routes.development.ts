import { Routes } from '@angular/router';

// TEMPORÁRIO: remover junto da página ilustrativa solicitada para o PR 37.
export const ROTAS_EXEMPLO_TURMAS: Routes = [{
  path: 'exemplo-turmas',
  loadComponent: () => import('./pages/exemplo-turmas/exemplo-turmas').then(m => m.ExemploTurmas),
}];
export const EXEMPLO_TURMAS_DISPONIVEL = true;
