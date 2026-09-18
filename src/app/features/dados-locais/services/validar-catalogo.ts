/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend Java.
 * Implementação exclusiva do armazenamento acadêmico e das contas locais no navegador.
 */
import { CatalogoLocal, DadosLocaisError } from '../models/catalogo-local';
import { DIAS_SEMANA } from '../../dashboard/models/grade-dia.model';

function exigir(condicao: unknown, mensagem: string): asserts condicao {
    if (!condicao) throw new DadosLocaisError(mensagem);
}
const objeto = (valor: unknown): valor is Record<string, unknown> =>
    !!valor && typeof valor === 'object' && !Array.isArray(valor);
const texto = (valor: unknown): valor is string => typeof valor === 'string' && !!valor.trim() && valor.length <= 250;
const numero = (valor: unknown): valor is number => typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;
const data = (valor: unknown): valor is string => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(Date.parse(valor)) && new Date(valor).toISOString().slice(0, 10) === valor;

/** Valida tudo antes da transação: um arquivo inválido nunca substitui o catálogo. */
export function validarCatalogo(valor: unknown): CatalogoLocal {
    exigir(objeto(valor) && valor['versao'] === 1, 'Formato não reconhecido. Use o modelo de catálogo versão 1.');
    exigir(texto(valor['titulo']) && data(valor['atualizadoEm']), 'Confira o título e a data de atualização do catálogo.');
    exigir((valor['vigenciaInicio'] === null && valor['vigenciaFim'] === null) ||
        (data(valor['vigenciaInicio']) && data(valor['vigenciaFim']) && valor['vigenciaInicio'] <= valor['vigenciaFim']),
        'Informe as duas datas de vigência, ou deixe ambas nulas para uma referência sem validade confirmada.');
    exigir(objeto(valor['quadroHorario']) && numero(valor['quadroHorario']['id']) &&
        numero(valor['quadroHorario']['versao']), 'Informe o quadro de horários e sua versão.');
    const nomes = ['cursos', 'disciplinas', 'professores', 'salas', 'turmas', 'ofertas', 'alocacoes'] as const;
    for (const nome of nomes) {
        const lista = valor[nome];
        exigir(Array.isArray(lista) && lista.length <= 2000, `A lista ${nome} é inválida ou muito grande (limite: 2.000 itens).`);
        exigir(lista.every(item => objeto(item) && numero(item['id'])) &&
            new Set(lista.map(item => item['id'])).size === lista.length, `Confira os IDs únicos de ${nome}.`);
    }
    // A estrutura foi conferida; os campos e vínculos são validados abaixo.
    const c = valor as unknown as CatalogoLocal;
    if (c.calendario !== undefined) {
        exigir(objeto(c.calendario) && Array.isArray(c.calendario.semAula) && Array.isArray(c.calendario.reposicoes), 'Calendário inválido.');
        for (const s of c.calendario.semAula) exigir(s && data(s.inicio) && data(s.fim) && s.inicio <= s.fim && texto(s.motivo), 'Confira as datas sem aula.');
        const reposicoes = new Set<string>();
        for (const r of c.calendario.reposicoes) {
            exigir(r && data(r.data) && DIAS_SEMANA.includes(r.diaSemana) && texto(r.turno), 'Confira as reposições.');
            const chave = `${r.data}:${r.turno}`;
            exigir(!reposicoes.has(chave), 'Reposição duplicada para a mesma data e turno.');
            exigir(!c.calendario.semAula.some(s => s.inicio <= r.data && r.data <= s.fim), 'Reposição coincide com uma data sem aula.');
            reposicoes.add(chave);
        }
    }
    exigir(c.cursos.length > 0, 'Cadastre ao menos um curso real antes de importar.');
    for (const curso of c.cursos) {
        exigir(['Anual', 'Semestral'].includes(curso.organizacao) && texto(curso.nome) && texto(curso.unidade) && ['Manhã', 'Tarde', 'Noite'].includes(curso.turno) &&
            (curso.cargaHoraria === null || numero(curso.cargaHoraria)) && numero(curso.duracaoSemestres) &&
            (curso.coordenador === null || texto(curso.coordenador)) &&
            Array.isArray(curso.periodos) && curso.periodos.length > 0 && curso.periodos.every(numero) &&
            curso.periodos.every((p, i) => i === 0 || p > curso.periodos[i - 1]), 'Confira os dados e períodos dos cursos.');
    }
    for (const d of c.disciplinas) exigir(texto(d.nome) &&
        c.cursos.some(curso => curso.id === d.cursoId && curso.periodos.includes(d.periodo)), 'Disciplina sem curso/período válido.');
    for (const p of c.professores) exigir(texto(p.nome), 'Informe o nome de cada professor.');
    for (const s of c.salas) exigir(texto(s.codigo), 'Informe o código de cada sala.');
    for (const t of c.turmas) exigir(texto(t.codigo) && texto(t.turno) && numero(t.ano) &&
        c.cursos.some(curso => curso.id === t.cursoId && curso.periodos.includes(t.periodo)), 'Turma sem curso/período válido.');
    const pares = new Set<string>();
    for (const o of c.ofertas) {
        const d = c.disciplinas.find(item => item.id === o.disciplinaId);
        const t = c.turmas.find(item => item.id === o.turmaId);
        const par = `${o.disciplinaId}:${o.turmaId}`;
        exigir(d && t && d.cursoId === t.cursoId && d.periodo === t.periodo && !pares.has(par),
            'Confira o vínculo único entre disciplina e turma em cada oferta.');
        pares.add(par);
    }
    const hora = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    for (const a of c.alocacoes) exigir(c.ofertas.some(o => o.id === a.ofertaId) &&
        (a.professorId === null || c.professores.some(p => p.id === a.professorId)) &&
        (a.salaId === null || c.salas.some(s => s.id === a.salaId)) &&
        DIAS_SEMANA.includes(a.diaSemana) && hora.test(a.horaInicio) && hora.test(a.horaFim) &&
        a.horaInicio < a.horaFim, 'Confira os vínculos, dia e horários de cada aula (HH:mm).');
    for (const o of c.ofertas) exigir(c.alocacoes.some(a => a.ofertaId === o.id), 'Toda oferta precisa ter ao menos um horário.');
    const aulas = [...c.alocacoes].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    for (let i = 0; i < aulas.length; i++) {
        const a = aulas[i];
        for (let j = i + 1; j < aulas.length && aulas[j].horaInicio < a.horaFim; j++) {
            const b = aulas[j];
            if (a.diaSemana !== b.diaSemana) continue;
            const turmaA = c.ofertas.find(o => o.id === a.ofertaId)!.turmaId;
            const turmaB = c.ofertas.find(o => o.id === b.ofertaId)!.turmaId;
            exigir((a.salaId === null || a.salaId !== b.salaId) &&
                (a.professorId === null || a.professorId !== b.professorId) && turmaA !== turmaB,
                `Há conflito de sala, professor ou turma entre as aulas ${a.id} e ${b.id}.`);
        }
    }
    return structuredClone(c);
}
