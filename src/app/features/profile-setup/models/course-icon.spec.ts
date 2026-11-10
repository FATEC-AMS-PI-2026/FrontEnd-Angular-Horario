import { courseIconAsset, courseIconByName } from './course-icon';

describe('Ícones dos cursos', () => {
  it('associa os cursos confirmados sem depender do ID da fonte', () => {
    expect(courseIconByName('Análise e Desenvolvimento de Sistemas — AMS')).toBe('code');
    expect(courseIconByName('  PGE – AMS  ')).toBe('chart');
    expect(courseIconByName('Gestão de Processos Gerenciais')).toBe('chart');
    expect(courseIconByName('Gestão de Eventos')).toBe('calendar');
    expect(courseIconByName('Mecatrônica Industrial')).toBe('bot');
    expect(courseIconByName('Secretariado')).toBe('briefcase');
  });

  it('não classifica cursos novos por nome parcial nem aceita caminhos como ícones', () => {
    expect(courseIconByName('Análise e Desenvolvimento de Sistemas de outro curso')).toBe('generic');
    expect(courseIconByName('Curso ainda não classificado')).toBe('generic');
    expect(courseIconAsset('https://exemplo.test/icone.svg')).toBe('course-generic');
    expect(courseIconAsset('toString')).toBe('course-generic');
    expect(courseIconAsset('chart')).toBe('course-chart');
  });
});
