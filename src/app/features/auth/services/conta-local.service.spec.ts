/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend Java.
 * Implementação exclusiva do armazenamento acadêmico e das contas locais no navegador.
 */
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ContaLocalService } from './conta-local.service';
import { AuthService } from './auth.service';
import { BancoLocalService, NOME_BANCO_LOCAL } from '../../dados-locais/services/banco-local.service';
import { DadosLocaisService } from '../../dados-locais/services/dados-locais.service';
import { CatalogoLocal } from '../../dados-locais/models/catalogo-local';
import { ProfileSetupService } from '../../profile-setup/services/profile-setup.service';
import { SessionService } from '../../../core/services/session.service';
import { BACKEND_CONFIG } from '../../../core/services/backend-config';

describe('Cadastro e login com contas deste navegador', () => {
  let contas: ContaLocalService;
  let banco: BancoLocalService;
  let auth: AuthService;
  let dados: DadosLocaisService;
  let nomeBanco: string;
  let http: jasmine.SpyObj<HttpClient>;
  const catalogo: CatalogoLocal = {
    versao: 1, titulo: 'ADS', atualizadoEm: '2026-09-18',
    vigenciaInicio: '2026-02-09', vigenciaFim: '2026-12-14', quadroHorario: { id: 1, versao: 1 },
    cursos: [{ id: 1, nome: 'ADS', organizacao: 'Anual', turno: 'Tarde', unidade: 'Fatec',
      periodos: [1, 2], cargaHoraria: null, duracaoSemestres: 4, coordenador: null }],
    disciplinas: [{ id: 1, nome: 'Disciplina', cursoId: 1, periodo: 1 }],
    professores: [], salas: [],
    turmas: [{ id: 1, codigo: 'ADS1', periodo: 1, ano: 2026, cursoId: 1, turno: 'Tarde' }],
    ofertas: [{ id: 1, disciplinaId: 1, turmaId: 1 }],
    alocacoes: [{ id: 1, ofertaId: 1, professorId: null, salaId: null, diaSemana: 'SEGUNDA', horaInicio: '13:20', horaFim: '14:10' }],
  };
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.removeItem('gini_token'); localStorage.removeItem('gini_usuario');
    nomeBanco = 'contas-teste-' + crypto.randomUUID();
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post']);
    http.get.and.returnValue(of(catalogo));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: NOME_BANCO_LOCAL, useValue: nomeBanco },
      { provide: HttpClient, useValue: http },
      { provide: BACKEND_CONFIG, useValue: { habilitado: false, url: 'https://backend.test/api' } },
    ] });
    contas = TestBed.inject(ContaLocalService); banco = TestBed.inject(BancoLocalService);
    auth = TestBed.inject(AuthService); dados = TestBed.inject(DadosLocaisService);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  afterEach(async () => {
    sessionStorage.clear();
    localStorage.removeItem('gini_token'); localStorage.removeItem('gini_usuario');
    await new Promise<void>((resolve, reject) => {
      const pedido = indexedDB.deleteDatabase(nomeBanco);
      pedido.onsuccess = () => resolve(); pedido.onerror = () => reject(pedido.error);
    });
  });

  it('cadastra, configura e entra novamente com escolhas persistidas e sem API', async () => {
    expect(await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: ' ANA@CPS.SP.GOV.BR ', senha: 'senha123' }))).toBe('/setup/course-selection');
    const setup = TestBed.inject(ProfileSetupService);
    setup.setCourse('ADS', '1'); setup.setPeriod('1º ano');
    await firstValueFrom(setup.listarDisciplinas()); setup.definirDisciplinas(['1']);
    await firstValueFrom(setup.submitProfile());
    auth.logout();
    expect(await firstValueFrom(auth.login('ana@cps.sp.gov.br', 'senha123'))).toBe('/setup/period-selection');
    expect(setup.selectedDisciplinas()).toEqual(['1']);
    expect(TestBed.inject(SessionService).usuario()?.email).toBe('ana@cps.sp.gov.br');
    expect(http.get).toHaveBeenCalledOnceWith('dados/ads-ams-primeiro-ano.json');
    expect(http.post).not.toHaveBeenCalled();
    expect(JSON.stringify(await banco.ler('contas'))).not.toContain('senha123');
  });

  it('atualiza docentes do catálogo antigo sem invalidar contas e disciplinas salvas', async () => {
    await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' }));
    await dados.disciplinas('1'); await dados.salvar('1', '1º ano', ['1']);
    const antes = await dados.catalogo();
    await banco.executar<void>('readwrite', store => {
      store.delete('catalogo-fixo-v4-pge'); store.put(true, 'catalogo-fixo-v1');
    });
    const atualizado: CatalogoLocal = { ...catalogo, atualizadoEm: '2026-09-21',
      professores: [{ id: 9, nome: 'Lilian Oliveira' }],
      alocacoes: catalogo.alocacoes.map(a => ({ ...a, professorId: 9 })) };
    http.get.and.returnValue(of(atualizado));
    auth.logout();
    expect(await firstValueFrom(auth.login('ana@cps.sp.gov.br', 'senha123'))).toBe('/setup/period-selection');
    expect((await dados.catalogo())?.revisao).toBe(antes?.revisao);
    expect((await dados.carregarPerfil()).disciplinasIds).toEqual(['1']);
    expect((await dados.grade('2026-09-14'))[0].professor?.nome).toBe('Lilian Oliveira');
    http.get.calls.reset(); await contas.prepararCatalogo();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('acrescenta o segundo ano e salas sem perder a grade salva do primeiro ano', async () => {
    await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' }));
    await dados.disciplinas('1'); await dados.salvar('1', '1º ano', ['1']);
    const antes = await dados.catalogo();
    await banco.executar<void>('readwrite', store => {
      store.delete('catalogo-fixo-v4-pge'); store.put(true, 'catalogo-fixo-v2-professores');
    });
    const novo = structuredClone(catalogo);
    novo.salas = [{ id: 1, codigo: 'LAB 03' }, { id: 2, codigo: 'LAB 02' }];
    novo.alocacoes[0].salaId = 1;
    novo.disciplinas.push({ id: 2, nome: 'Disciplina segundo ano', periodo: 2, cursoId: 1 });
    novo.turmas.push({ ...novo.turmas[0], id: 2, codigo: 'ADS2', periodo: 2 });
    novo.ofertas.push({ id: 2, disciplinaId: 2, turmaId: 2 });
    novo.alocacoes.push({ ...novo.alocacoes[0], id: 2, ofertaId: 2, salaId: 2 });
    http.get.and.returnValue(of(novo));
    await contas.prepararCatalogo();
    expect((await dados.catalogo())?.revisao).toBe(antes?.revisao);
    expect((await dados.carregarPerfil()).disciplinasIds).toEqual(['1']);
    expect((await dados.grade('2026-09-14'))[0].sala?.codigo).toBe('LAB 03');
    await dados.disciplinas('1'); await dados.salvar('1', '2º ano', ['2']);
    expect((await dados.grade('2026-09-14'))[0].sala?.codigo).toBe('LAB 02');
    await expectAsync(dados.salvar('1', '2º ano', ['1', '2'])).toBeRejected();
  });

  it('acrescenta outro curso sem invalidar ADS e mantém as matrizes separadas', async () => {
    await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' }));
    await dados.disciplinas('1'); await dados.salvar('1', '1º ano', ['1']);
    const antes = await dados.catalogo();
    await banco.executar<void>('readwrite', store => {
      store.delete('catalogo-fixo-v4-pge'); store.put(true, 'catalogo-fixo-v3-salas-segundo-ano');
    });
    const novo = structuredClone(catalogo);
    novo.cursos.push({ ...novo.cursos[0], id: 2, nome: 'PGE — AMS' });
    novo.disciplinas.push({ id: 2, nome: 'Economia', periodo: 1, cursoId: 2 });
    novo.turmas.push({ ...novo.turmas[0], id: 2, codigo: 'PGE1', cursoId: 2 });
    novo.ofertas.push({ id: 2, disciplinaId: 2, turmaId: 2 });
    novo.salas.push({ id: 1, codigo: 'Sala 9¾' });
    novo.alocacoes.push({ ...novo.alocacoes[0], id: 2, ofertaId: 2, salaId: 1 });
    http.get.and.returnValue(of(novo)); await contas.prepararCatalogo();
    expect((await dados.catalogo())?.revisao).toBe(antes?.revisao);
    expect((await dados.carregarPerfil()).disciplinasIds).toEqual(['1']);
    expect((await dados.disciplinas('1')).map(d => d.id)).toEqual(['1']);
    expect((await dados.disciplinas('2')).map(d => d.id)).toEqual(['2']);
    await expectAsync(dados.salvar('1', '1º ano', ['2'])).toBeRejected();
    await dados.salvar('2', '1º ano', ['2']);
    expect((await dados.grade('2026-09-14'))[0].sala?.codigo).toBe('Sala 9¾');
  });

  it('exige revisão das escolhas se a atualização também mudar os horários', async () => {
    await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' }));
    await dados.disciplinas('1'); await dados.salvar('1', '1º ano', ['1']);
    await banco.executar<void>('readwrite', store => store.delete('catalogo-fixo-v4-pge'));
    http.get.and.returnValue(of({ ...catalogo,
      alocacoes: catalogo.alocacoes.map(a => ({ ...a, horaInicio: '13:30' })) }));
    await contas.prepararCatalogo();
    expect((await dados.carregarPerfil()).configuracaoInicialConcluida).toBeFalse();
  });

  it('mantém a grade na reentrada sem lembrar de mim e reconhece a sessão da aba', async () => {
    await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' }));
    await dados.disciplinas('1'); await dados.salvar('1', '1º ano', ['1']);
    auth.logout();
    expect(await firstValueFrom(auth.login('ana@cps.sp.gov.br', 'senha123', false))).toBe('/setup/period-selection');
    expect(localStorage.getItem('gini_token')).toBeNull();
    expect(sessionStorage.getItem('gini_token')).toContain('gini-local:');
    expect(auth.isLoggedIn()).toBeTrue();
    expect(dados.ativo).toBeTrue();
    expect((await dados.grade('2026-09-14')).length).toBe(1);
    auth.logout();
    expect(sessionStorage.getItem('gini_token')).toBeNull();
    expect((await dados.perfis()).length).toBe(1);
    await firstValueFrom(auth.login('ana@cps.sp.gov.br', 'senha123', true));
    expect(localStorage.getItem('gini_token')).toContain('gini-local:');
    expect(sessionStorage.getItem('gini_token')).toBeNull();
  });

  it('recusa senha incorreta e e-mail duplicado sem criar outro perfil', async () => {
    await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' }));
    await expectAsync(firstValueFrom(auth.login('ana@cps.sp.gov.br', 'incorreta'))).toBeRejected();
    expect(localStorage.getItem('gini_token')).toBeNull();
    await expectAsync(contas.cadastrar('Outra', 'ANA@CPS.SP.GOV.BR', 'outrasenha')).toBeRejected();
    expect((await dados.perfis()).length).toBe(1);
  });

  it('sempre cria um perfil novo sem associar nem apagar perfis antigos', async () => {
    await dados.importar(catalogo);
    const antigo = await dados.criarPerfil('Perfil antigo');
    localStorage.setItem('gini_token', dados.prefixo + antigo.id);
    await dados.disciplinas('1'); await dados.salvar('1', '1º ano', ['1']);
    expect(await firstValueFrom(auth.cadastrar({ nome: 'Ana', email: 'ana@cps.sp.gov.br', senha: 'senha123' }))).toBe('/setup/course-selection');
    expect(localStorage.getItem('gini_token')).not.toBe(dados.prefixo + antigo.id);
    expect((await dados.carregarPerfil()).disciplinasIds).toEqual([]);
    const perfis = await dados.perfis();
    expect(perfis.length).toBe(2);
    expect(perfis.find(p => p.id === antigo.id)?.ofertasIds).toEqual([1]);
  });

  it('não grava conta quando o catálogo falha e permite tentar novamente', async () => {
    http.get.and.returnValue(throwError(() => new Error('Falha de carregamento')));
    await expectAsync(contas.cadastrar('Ana', 'ana@cps.sp.gov.br', 'senha123')).toBeRejected();
    expect(await dados.perfis()).toEqual([]);
    expect(await banco.ler('contas')).toBeUndefined();
    http.get.and.returnValue(of(catalogo));
    await contas.cadastrar('Ana', 'ana@cps.sp.gov.br', 'senha123');
    expect((await dados.perfis()).length).toBe(1);
  });

  it('serializa cadastros simultâneos e não promete recuperação por e-mail', async () => {
    await contas.prepararCatalogo();
    const resultados = await Promise.allSettled([
      contas.cadastrar('Ana', 'ana@cps.sp.gov.br', 'senha123'),
      contas.cadastrar('Ana', 'ana@cps.sp.gov.br', 'senha123'),
    ]);
    expect(resultados.filter(r => r.status === 'fulfilled').length).toBe(1);
    expect((await dados.perfis()).length).toBe(1);
    await expectAsync(firstValueFrom(auth.recuperarSenha('ana@cps.sp.gov.br'))).toBeRejected();
    expect(http.post).not.toHaveBeenCalled();
  });
});
