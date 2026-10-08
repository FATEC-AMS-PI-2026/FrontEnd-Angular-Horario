import { AulaDoDia } from '../models/aula-do-dia';
import { proximosHorariosDaSala } from './proximos-horarios-sala';

describe('Próximos horários da sala', () => {
  const agora = (hora: string) => new Date(`2026-10-08T${hora}:00-03:00`);
  const aula = (inicio: string, termino: string, disciplina = 'Disciplina'): AulaDoDia => ({
    inicio, termino, disciplina, professor: 'Professor', turma: 'Turma',
  });
  const blocos = (aulas: AulaDoDia[], hora: string, completa = true) =>
    proximosHorariosDaSala(aulas, agora(hora), completa).map(item => [item.tipo, item.inicio, item.termino]);

  it('ordena aulas e inclui vazios antes/depois delas, sem confundir a pausa com sala vazia', () => {
    expect(blocos([aula('15:10', '16:50'), aula('13:20', '15:00')], '07:00')).toEqual([
      ['vazio', '08:00', '13:20'], ['aula', '13:20', '15:00'],
      ['aula', '15:10', '16:50'], ['vazio', '16:50', '21:30'],
    ]);
    const dados = proximosHorariosDaSala([aula('13:20', '15:00', 'Programação')], agora('08:00'), true);
    expect(dados[1].atividade).toBe('Programação');
    expect(dados[1].professor).toBe('Professor');
    expect(dados[0].atividade).toBe('Sala vazia');
    expect(dados[0].professor).toBeUndefined();
  });

  it('mostra um único vazio em um dia sem aulas, começando às 8h ou no momento atual', () => {
    expect(blocos([], '07:00')).toEqual([['vazio', '08:00', '21:30']]);
    expect(blocos([], '13:20')).toEqual([['vazio', '13:20', '21:30']]);
  });

  it('oculta pausas de 5, 10, 20 e 30 minutos entre aulas, mesmo com disciplinas diferentes', () => {
    for (const minutos of [5, 10, 20, 30]) {
      const inicio = `15:${minutos.toString().padStart(2, '0')}`;
      expect(blocos([aula('13:20', '15:00', 'Disciplina A'), aula(inicio, '16:50', 'Disciplina B')], '08:00')).toEqual([
        ['vazio', '08:00', '13:20'], ['aula', '13:20', '15:00'],
        ['aula', inicio, '16:50'], ['vazio', '16:50', '21:30'],
      ]);
    }
  });

  it('preserva lacunas acima de 30 minutos sem reduzi-las ao tempo restante no relógio', () => {
    const aulas = [aula('13:00', '14:00'), aula('14:31', '16:00')];
    expect(blocos(aulas, '08:00')).toEqual([
      ['vazio', '08:00', '13:00'], ['aula', '13:00', '14:00'],
      ['vazio', '14:00', '14:31'], ['aula', '14:31', '16:00'], ['vazio', '16:00', '21:30'],
    ]);
    expect(blocos(aulas, '14:25')).toEqual([
      ['vazio', '14:25', '14:31'], ['aula', '14:31', '16:00'], ['vazio', '16:00', '21:30'],
    ]);
    expect(blocos([aula('13:00', '14:00'), aula('14:30', '16:00')], '14:25')).toEqual([
      ['aula', '14:30', '16:00'], ['vazio', '16:00', '21:30'],
    ]);
  });

  it('mantém períodos curtos antes da primeira aula e depois da última', () => {
    expect(blocos([aula('08:10', '21:20')], '07:00')).toEqual([
      ['vazio', '08:00', '08:10'], ['aula', '08:10', '21:20'], ['vazio', '21:20', '21:30'],
    ]);
  });

  it('mede a pausa a partir do término da ocupação sobreposta mais longa', () => {
    expect(blocos([aula('13:00', '15:00'), aula('13:30', '14:00'), aula('15:10', '16:00')], '08:00')).toEqual([
      ['vazio', '08:00', '13:00'], ['aula', '13:00', '15:00'],
      ['aula', '13:30', '14:00'], ['aula', '15:10', '16:00'], ['vazio', '16:00', '21:30'],
    ]);
  });

  it('começa o vazio atual no relógio e mantém a aula em andamento ocupando a sala', () => {
    expect(blocos([aula('15:10', '16:50')], '13:20')).toEqual([
      ['vazio', '13:20', '15:10'], ['aula', '15:10', '16:50'], ['vazio', '16:50', '21:30'],
    ]);
    expect(blocos([aula('13:00', '14:00')], '13:20')).toEqual([['vazio', '14:00', '21:30']]);
    expect(blocos([aula('13:00', '14:00')], '14:00')).toEqual([['vazio', '14:00', '21:30']]);
  });

  it('não inventa lacunas em aulas sobrepostas, contidas ou contíguas', () => {
    expect(blocos([aula('09:00', '11:00'), aula('09:30', '10:00'), aula('11:00', '12:00')], '08:00')).toEqual([
      ['vazio', '08:00', '09:00'], ['aula', '09:00', '11:00'],
      ['aula', '09:30', '10:00'], ['aula', '11:00', '12:00'], ['vazio', '12:00', '21:30'],
    ]);
  });

  it('recorta aulas nos limites das 8h e 21h30 e ignora as externas ao período', () => {
    expect(blocos([aula('06:00', '08:00'), aula('07:30', '09:00'), aula('21:00', '22:00'), aula('21:30', '23:00')], '07:00')).toEqual([
      ['aula', '08:00', '09:00'], ['vazio', '09:00', '21:00'], ['aula', '21:00', '21:30'],
    ]);
    expect(blocos([aula('07:30', '22:00')], '08:00')).toEqual([]);
  });

  it('não gera blocos encerrados ou vazios sem duração depois das 21h30', () => {
    expect(blocos([], '21:30')).toEqual([]);
    expect(blocos([aula('22:00', '23:00')], '22:00')).toEqual([]);
  });

  it('preserva aulas conhecidas, sem declarar vazios em consultas incompletas ou inválidas', () => {
    expect(blocos([], '08:00', false)).toEqual([]);
    expect(blocos([aula('13:00', '14:00')], '08:00', false)).toEqual([['aula', '13:00', '14:00']]);
    expect(blocos([aula('13:00', '14:00'), aula('16:00', '15:00')], '08:00')).toEqual([['aula', '13:00', '14:00']]);
    expect(blocos([aula('xx:00', '15:00')], '08:00')).toEqual([]);
  });

  it('usa o relógio de São Paulo mesmo quando o instante é recebido em UTC', () => {
    const resultado = proximosHorariosDaSala([], new Date('2026-10-08T16:20:00Z'), true);
    expect(resultado[0].inicio).toBe('13:20');
  });
});
