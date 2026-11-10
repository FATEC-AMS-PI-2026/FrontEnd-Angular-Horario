import { FigmaIconName } from '../../../shared/components/figma-icon/icon-assets';

export type CourseIcon = 'code' | 'chart' | 'calendar' | 'bot' | 'briefcase' | 'generic';

/** Correspondências explícitas aos cursos do protótipo e aos dois cursos locais conhecidos.
 * Nomes não reconhecidos não herdam o ícone de ADS nem são classificados por trechos do nome. */
const ICONS_BY_COURSE: Readonly<Record<string, CourseIcon>> = {
  'analise e desenvolvimento de sistemas': 'code',
  'analise e desenvolvimento de sistemas ams': 'code',
  'gestao de processos gerenciais': 'chart',
  'gestao de processos gerenciais ams': 'chart',
  'pge ams': 'chart',
  'gestao de eventos': 'calendar',
  'mecatronica industrial': 'bot',
  secretariado: 'briefcase',
};

export function courseIconByName(name: string): CourseIcon {
  const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim();
  return Object.hasOwn(ICONS_BY_COURSE, key) ? ICONS_BY_COURSE[key] : 'generic';
}

export function courseIconAsset(icon: string): FigmaIconName {
  switch (icon) {
    case 'code': return 'course-code';
    case 'chart': return 'course-chart';
    case 'calendar': return 'course-calendar';
    case 'bot': return 'course-bot';
    case 'briefcase': return 'course-briefcase';
    default: return 'course-generic';
  }
}
