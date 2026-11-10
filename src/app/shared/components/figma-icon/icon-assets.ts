/** Assets do Figma, com traços do menu uniformizados para 2 px ao exibir em 22 px.
 * O card de período só fornece a localização em imagem;
 * location.svg preserva o desenho vetorial já usado pelo projeto.
 * projetor.png é o PNG original fornecido pelo usuário. */
export const ICON_ASSETS = {
  lock: 'configuracoes/lock.svg', alert: 'configuracoes/alert.svg',
  bell: 'configuracoes/bell.svg', moon: 'configuracoes/moon.svg',
  logout: 'configuracoes/logout.svg', chevron: 'configuracoes/chevron.svg',
  info: 'configuracoes/info.svg', shield: 'configuracoes/shield.svg',
  file: 'configuracoes/file.svg', external: 'configuracoes/external.svg',
  calendar: 'configuracoes/calendar.svg',
  home: 'interface/home.svg', avatar: 'interface/avatar.svg', clock: 'interface/clock.svg',
  'calendar-nav': 'interface/calendar-nav.svg', rooms: 'interface/rooms.svg',
  person: 'interface/person.svg', settings: 'interface/settings.svg',
  'logout-nav': 'interface/logout-nav.svg', search: 'interface/search.svg',
  more: 'interface/more.svg', location: 'interface/location.svg',
  'arrow-right': 'interface/arrow-right.svg', 'arrow-left': 'interface/arrow-right.svg',
  'course-code': 'cursos/code.png', 'course-chart': 'cursos/chart.png',
  'course-calendar': 'cursos/calendar.png', 'course-bot': 'cursos/robot.png',
  'course-briefcase': 'cursos/briefcase.png', 'step-completed': 'onboarding/completed.png',
  wifi: 'salas/wifi.png', television: 'salas/televisao.png', chair: 'salas/cadeira.png',
  computer: 'salas/computador.png', 'air-conditioning': 'salas/ar-condicionado.png',
  projector: 'salas/projetor.png',
  classroom: 'salas/sala.png', laboratory: 'salas/laboratorio.png',
} as const;

/** Símbolos preservados do projeto: não há asset separado confirmado no protótipo. */
export const ICON_SYMBOLS = { close: '✕', add: '+', remove: '−', generic: '◇', 'course-generic': '◇' } as const;

export type FigmaIconName = keyof typeof ICON_ASSETS | keyof typeof ICON_SYMBOLS;

/** A lista fechada também impede que metadados de Services se tornem URLs arbitrárias. */
export function iconResource(name: string) {
  if (Object.hasOwn(ICON_ASSETS, name)) {
    const key = name as keyof typeof ICON_ASSETS;
    return { path: `/icons/${ICON_ASSETS[key]}`, symbol: '', flipped: key === 'arrow-left' };
  }
  const symbol = Object.hasOwn(ICON_SYMBOLS, name)
    ? ICON_SYMBOLS[name as keyof typeof ICON_SYMBOLS] : ICON_SYMBOLS.generic;
  return { path: '', symbol, flipped: false };
}
