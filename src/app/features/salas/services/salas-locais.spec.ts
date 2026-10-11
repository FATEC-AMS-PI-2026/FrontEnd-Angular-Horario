import { SalasLocaisService, aulasLocaisDaSala, codigoSala, disponibilidadeLocalDaSala, equipamentosLocaisDaSala, tipoSalaLocal, unirSalas } from './salas-locais';
import { aulasJavaDaSala, unirAulas, calcularDisponibilidade } from './disponibilidade-sala';
import { DadosLocaisError } from '../../dados-locais/models/catalogo-local';
import { DadosLocaisService } from '../../dados-locais/services/dados-locais.service';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { catalogoSalaLocal as catalogo } from '../testing/catalogo-local.fixture';

const agora = new Date('2026-10-05T13:20:00-03:00');
describe('Salas: combinação do Java com o catálogo local', () => {
 it('associa por código sem equiparar IDs nem perder salas exclusivas', () => {
   const salas = unirSalas([{id:1,nome:'LAB-01',capacidade:40}], [{id:90,nome:'LAB 01',rotaId:'local-90'}, {id:1,nome:'LAB 02',rotaId:'local-1'}]);
   expect(salas.map(s => s.rotaId ?? s.id)).toEqual([1,'local-1']);
   expect(salas[0].capacidade).toBe(40);
   expect(codigoSala('Sala 9¾')).not.toBe(codigoSala('Sala 09'));
 });
 it('busca aulas pela sala, independentemente das disciplinas escolhidas pelo aluno', () => {
   expect(aulasLocaisDaSala(catalogo(),'LAB-01',agora)[0]).toEqual({inicio:'13:00',termino:'14:00',disciplina:'Disciplina local',professor:'Docente local',turma:'Turma local',origem:'local'});
   expect(aulasLocaisDaSala(catalogo(),'LAB 02',agora)).toEqual([]);
 });
 it('respeita vigência, feriados e reposições por turno', () => {
   const c=catalogo(); c.vigenciaFim='2026-09-30'; expect(aulasLocaisDaSala(c,'LAB 01',agora)).toEqual([]);
   c.vigenciaFim='2026-12-20'; c.calendario={semAula:[{inicio:'2026-10-05',fim:'2026-10-05',motivo:'Sem aulas'}],reposicoes:[]};
   expect(aulasLocaisDaSala(c,'LAB 01',agora)).toEqual([]);
   c.calendario={semAula:[],reposicoes:[{data:'2026-10-06',diaSemana:'SEGUNDA',turno:'Tarde'}]};
   expect(aulasLocaisDaSala(c,'LAB 01',new Date('2026-10-06T13:20:00-03:00')).length).toBe(1);
 });
 it('não associa um código local ambíguo', () => {
   const c=catalogo(); c.salas.push({id:91,codigo:'LAB-01'});
   expect(aulasLocaisDaSala(c,'LAB 01',agora)).toEqual([]);
 });
 it('mantém o Java nos conflitos e complementa os outros horários locais', () => {
   const local=aulasLocaisDaSala(catalogo(),'LAB 01',agora);
   const java=[{inicio:'13:20',termino:'14:10',disciplina:'Disciplina Java',professor:'Docente Java',turma:'Turma Java',origem:'java' as const}];
   const tarde={...local[0],inicio:'15:00',termino:'16:00'};
   expect(unirAulas(java,[...local,tarde])).toEqual([...java,tarde]);
   expect(calcularDisponibilidade(1,[],agora,local).status).toBe('Em uso');
 });
 it('mapeia nomes retornados pelo Java e mantém vazios os ausentes', () => {
   const alocacao={id:1,sala:{id:7},diaSemana:'SEGUNDA',blocoHorario:{horaInicio:'13:00:00',horaFim:'14:00:00'},quadroHorario:{status:'ATIVO',periodoAtividadeQuadro:{status:'ATIVO',dataInicio:'2026-08-01',dataFim:'2026-12-20'}}};
   expect(aulasJavaDaSala(7,[alocacao],agora)[0].disciplina).toBe('');
   expect(aulasJavaDaSala(7,[{...alocacao,disciplina:{nome:'Disciplina Java'},professor:{nome:'Docente Java'},turma:{codigo:'Turma Java'}}],agora)[0].professor).toBe('Docente Java');
 });
});

describe('SalasLocaisService', () => {
 it('identifica Prédio 1 no catálogo existente e mantém Auditório separado sem modificar o catálogo', fakeAsync(() => {
   const c = catalogo();
   c.salas.push({id:91,codigo:'Auditório'}, {id:92,codigo:'AUDITORIO'}, {id:93,codigo:'AUD-01'});
   TestBed.configureTestingModule({ providers: [{ provide: DadosLocaisService,
     useValue: { catalogo: () => Promise.resolve({ catalogo: c }) } }] });
   const service = TestBed.inject(SalasLocaisService); tick();
   expect(service.salas().map(sala => sala.predio)).toEqual(['Prédio 1', undefined, undefined, undefined]);
   expect(service.salas().map(sala => sala.rotaId)).toEqual(['local-90', 'local-91', 'local-92', 'local-93']);
   expect(service.salas()[0].tipo).toBe('Laboratório');
   expect(c.salas[0]).toEqual({id:90,codigo:'LAB 01'});
 }));
 it('preserva a orientação do IndexedDB e recupera a leitura numa nova tentativa', fakeAsync(() => {
   const consultar = jasmine.createSpy('catalogo').and.callFake(() =>
     Promise.reject(new DadosLocaisError('Feche outras abas do site e tente novamente.')));
   TestBed.configureTestingModule({ providers: [{ provide: DadosLocaisService, useValue: { catalogo: consultar } }] });
   const service = TestBed.inject(SalasLocaisService); tick();
   expect(service.erro()).toBe('Feche outras abas do site e tente novamente.');
   expect(service.carregando()).toBeFalse();
   consultar.and.callFake(() => Promise.resolve({ catalogo: catalogo(), revisao: 'teste', importadoEm: '' }));
   service.carregar(); tick();
   expect(service.erro()).toBeNull();
   expect(service.salas()[0].nome).toBe('LAB 01');
 }));
});

describe('Salas locais: equipamentos e ocupação temporários', () => {
 const sala = (nome = 'LAB 01') => ({ id: 90, nome, origem: 'local' as const, rotaId: 'local-90' });

 it('aplica o inventário solicitado ao tipo local, preservando Java e Auditório', () => {
   expect(equipamentosLocaisDaSala(sala())?.map(e => [e.nome, e.quantidadeTotal]))
     .toEqual([['Projetor multimidia', 1], ['Computadores', 40]]);
   expect(equipamentosLocaisDaSala(sala('Sala 9¾'))?.map(e => [e.nome, e.quantidadeTotal]))
     .toEqual([['Televisão', 1], ['Projetor multimidia', 1]]);
   expect(equipamentosLocaisDaSala({ ...sala(), origem: 'java' })).toBeNull();
   expect(equipamentosLocaisDaSala(sala('AUD-01'))).toBeNull();
   expect(tipoSalaLocal('Laboratório 3')).toBe('Laboratório');
 });

 it('fica Em uso durante a aula e Livre antes e no término, sem depender da grade pessoal', () => {
   const c = catalogo();
   expect(disponibilidadeLocalDaSala(c, sala(), new Date('2026-10-05T12:59:59-03:00'))?.status).toBe('Livre');
   expect(disponibilidadeLocalDaSala(c, sala(), new Date('2026-10-05T13:00:00-03:00')))
     .toEqual({ status: 'Em uso', texto: 'Em uso' });
   expect(disponibilidadeLocalDaSala(c, sala(), new Date('2026-10-05T14:00:00-03:00')))
     .toEqual({ status: 'Livre', texto: 'Livre' });
   c.alocacoes.push({ ...c.alocacoes[0], id: 2, horaInicio: '16:00', horaFim: '17:00' });
   expect(disponibilidadeLocalDaSala(c, sala(), new Date('2026-10-05T16:20:00-03:00'))?.status).toBe('Em uso');
 });

 it('respeita feriados, reposições por turno e vigência no status local', () => {
   const c = catalogo();
   c.calendario = { semAula: [{ inicio: '2026-10-05', fim: '2026-10-05', motivo: 'Feriado' }], reposicoes: [] };
   expect(disponibilidadeLocalDaSala(c, sala(), agora)?.status).toBe('Livre');
   c.calendario = { semAula: [], reposicoes: [{ data: '2026-10-06', diaSemana: 'SEGUNDA', turno: 'Tarde' }] };
   expect(disponibilidadeLocalDaSala(c, sala(), new Date('2026-10-06T13:20:00-03:00'))?.status).toBe('Em uso');
   c.calendario.reposicoes[0].turno = 'Manhã';
   expect(disponibilidadeLocalDaSala(c, sala(), new Date('2026-10-06T13:20:00-03:00'))?.status).toBe('Livre');
   c.vigenciaFim = '2026-09-30';
   expect(disponibilidadeLocalDaSala(c, sala(), agora)?.status).toBe('Livre');
 });

 it('não confunde catálogo ausente, código ambíguo ou horário inválido com sala Livre', () => {
   expect(disponibilidadeLocalDaSala(null, sala(), agora)).toBeUndefined();
   const c = catalogo();
   c.salas.push({ id: 91, codigo: 'LAB-01' });
   expect(disponibilidadeLocalDaSala(c, sala(), agora)).toBeUndefined();
   c.salas.pop(); c.alocacoes[0].horaInicio = '25:00';
   expect(disponibilidadeLocalDaSala(c, sala(), agora)).toBeUndefined();
   expect(disponibilidadeLocalDaSala(c, { ...sala(), origem: 'java' }, agora)).toBeUndefined();
 });
});
