import { Injectable, signal } from '@angular/core';
import { Professor } from '../models/professor';

/**
 * Dados de exemplo enquanto o endpoint de professores do BackEnd-Java não
 * existe. Quando a API estiver disponível, troque o array abaixo por uma
 * chamada HttpClient (mesmo padrão adotado em `SalasService`).
 *
 * Os três primeiros professores (ADS) refletem o que aparece na referência
 * visual da tela; os demais cursos foram preenchidos com dados mínimos
 * apenas para que os chips de curso e o filtro de cargo tenham o que
 * mostrar — a referência não define esses dados.
 */
const PROFESSORES_MOCK: Professor[] = [
    {
        id: 1,
        nome: 'Glauco Todesco',
        cargo: 'Professor',
        curso: 'ADS',
        aulas: [
            {
                diaSemana: 'Terça-feira',
                inicio: '13:20',
                termino: '14:10',
                disciplina: 'Projeto Integrador I',
                local: 'Lab. 03 – Prédio 4 | Andar 3',
                cor: 'verde',
            },
            {
                diaSemana: 'Terça-feira',
                inicio: '14:10',
                termino: '15:00',
                disciplina: 'Projeto Integrador I',
                local: 'Lab. 03 – Prédio 4 | Andar 3',
                cor: 'verde',
            },
            {
                diaSemana: 'Terça-feira',
                inicio: '15:10',
                termino: '16:00',
                disciplina: 'Projeto Integrador I',
                local: 'Lab. 03 – Prédio 4 | Andar 3',
                cor: 'verde',
            },
            {
                diaSemana: 'Terça-feira',
                inicio: '16:00',
                termino: '16:50',
                disciplina: 'Projeto Integrador I',
                local: 'Lab. 03 – Prédio 4 | Andar 3',
                cor: 'verde',
            },
            {
                diaSemana: 'Sexta-feira',
                inicio: '13:20',
                termino: '14:10',
                disciplina: 'Técnicas Avançadas de Programação Web e Mobile',
                local: 'Lab. 01 – Prédio 4 | Andar 3',
                cor: 'vermelho',
            },
            {
                diaSemana: 'Sexta-feira',
                inicio: '14:10',
                termino: '15:00',
                disciplina: 'Técnicas Avançadas de Programação Web e Mobile',
                local: 'Lab. 01 – Prédio 4 | Andar 3',
                cor: 'vermelho',
            },
        ],
    },
    {
        id: 2,
        nome: 'Renato',
        cargo: 'Professor',
        curso: 'ADS',
        aulas: [
            {
                diaSemana: 'Segunda-feira',
                inicio: '08:00',
                termino: '09:40',
                disciplina: 'Banco de Dados',
                local: 'Sala 12 – Prédio 2 | Andar 1',
                cor: 'azul',
            },
        ],
    },
    {
        id: 3,
        nome: 'Antonio Tadeu',
        cargo: 'Coordenador do Curso',
        curso: 'ADS',
        aulas: [
            {
                diaSemana: 'Quarta-feira',
                inicio: '10:00',
                termino: '11:40',
                disciplina: 'Engenharia de Software',
                local: 'Sala 05 – Prédio 4 | Andar 2',
                cor: 'roxo',
            },
        ],
    },
    {
        id: 4,
        nome: 'Marisa Andrade',
        cargo: 'Professor',
        curso: 'PG',
        aulas: [
            {
                diaSemana: 'Quinta-feira',
                inicio: '19:00',
                termino: '20:40',
                disciplina: 'Gestão de Pessoas',
                local: 'Sala 08 – Prédio 1 | Andar 1',
                cor: 'verde',
            },
        ],
    },
    {
        id: 5,
        nome: 'Helena Prado',
        cargo: 'Coordenador do Curso',
        curso: 'Secretariado',
        aulas: [],
    },
    {
        id: 6,
        nome: 'João Bezerra',
        cargo: 'Professor',
        curso: 'Mecatronica',
        aulas: [
            {
                diaSemana: 'Segunda-feira',
                inicio: '13:20',
                termino: '15:00',
                disciplina: 'Automação Industrial',
                local: 'Lab. 02 – Prédio 3 | Andar 1',
                cor: 'azul',
            },
        ],
    },
];

@Injectable({ providedIn: 'root' })
export class ProfessoresService {
    private readonly professoresSignal = signal<Professor[]>(PROFESSORES_MOCK);

    /** Lista reativa de professores, pronta para ser usada em templates com signals. */
    readonly professores = this.professoresSignal.asReadonly();

    // TODO(integração backend): quando a rota REST de professores existir no
    // BackEnd-Java, injetar HttpClient aqui e substituir o mock por algo como:
    //
    //   private readonly http = inject(HttpClient);
    //
    //   carregarProfessores(): void {
    //     this.http.get<Professor[]>('/api/professores').subscribe((professores) => this.professoresSignal.set(professores));
    //   }
    //
    // O restante do código (componente da página) não muda, porque ele só
    // depende do signal `professores`.
}
