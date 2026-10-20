import { Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EquipamentosCard } from '../../features/salas/components/equipamentos-card/equipamentos-card';
import { Dashboard } from '../../features/dashboard/dashboard';
import { GradeSemanal } from '../../features/grade-semanal/grade-semanal';
import { Professores } from '../../features/professores/professores';
import { ConsultaSalasService } from '../../features/salas/services/consulta-salas';
import { SalaResumo } from '../../features/salas/models/sala-resumo';
import { CARREGAR_GRADE_SEMANAL } from '../../features/horarios/services/grade-semanal-source';
import { AlocacaoResponse } from '../../features/dashboard/models/grade-dia.model';
import { of } from 'rxjs';

// Mede as cores realmente renderizadas, incluindo herança de fundo e opacidade.
function rgb(cor: string): number[] {
    return (cor.match(/[\d.]+/g) ?? []).map(Number);
}

function luminancia(cor: number[]): number {
    const canais = cor.slice(0, 3).map(canal => {
        const valor = canal / 255;
        return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
    });
    return canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
}

function contraste(elemento: Element): number {
    let ancestral: Element | null = elemento;
    let fundo = [255, 255, 255];
    while (ancestral) {
        const cor = rgb(getComputedStyle(ancestral).backgroundColor);
        if (cor.length === 3 || cor[3] === 1) {
            fundo = cor;
            break;
        }
        ancestral = ancestral.parentElement;
    }
    const estilo = getComputedStyle(elemento);
    const texto = rgb(estilo.color);
    const alfa = Number(estilo.opacity) * (texto[3] ?? 1);
    const frente = texto.slice(0, 3).map((canal, indice) => canal * alfa + fundo[indice] * (1 - alfa));
    const valores = [luminancia(frente), luminancia(fundo)].sort((a, b) => b - a);
    return (valores[0] + 0.05) / (valores[1] + 0.05);
}

function verificar(elemento: HTMLElement, seletor: string): void {
    const textos = Array.from(elemento.querySelectorAll(seletor));
    expect(textos.length).withContext(seletor).toBeGreaterThan(0);
    for (const texto of textos) {
        expect(contraste(texto))
            .withContext(`${document.documentElement.dataset['theme']}: ${texto.textContent?.trim()}`)
            .toBeGreaterThanOrEqual(4.5);
    }
}

describe('Contraste das telas acadêmicas', () => {
    afterEach(() => document.documentElement.removeAttribute('data-theme'));

    for (const tema of ['light', 'dark']) {
        async function montar<T>(component: Type<T>) {
            document.documentElement.dataset['theme'] = tema;
            TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
            if (component === Dashboard) {
                const salas: SalaResumo[] = [
                    { id: 1, nome: 'LAB Livre', status: 'Livre' },
                    { id: 2, nome: 'LAB Em uso', status: 'Em uso' },
                    { id: 3, nome: 'LAB Manutenção', status: 'Manutenção' },
                ];
                TestBed.configureTestingModule({ providers: [{ provide: CARREGAR_GRADE_SEMANAL,
                    useValue: () => of([{ sala: { id: 1, codigo: 'LAB Livre' } } as AlocacaoResponse]) }] });
                TestBed.overrideComponent(Dashboard, { set: { providers: [
                    { provide: ConsultaSalasService, useValue: {
                        salas: signal(salas), carregando: signal(false), erro: signal(null),
                        estadoAgenda: signal({ carregando: false, erro: null }), locais: { erro: signal(null) },
                        disponibilidade: (sala: SalaResumo) => ({ status: sala.status, texto: sala.status }),
                    } },
                ] } });
            }
            await TestBed.compileComponents();
            const fixture = TestBed.createComponent(component);
            fixture.detectChanges();
            return fixture;
        }

        it(`mantém textos de aulas, professores, intervalos e status legíveis no dashboard (${tema})`, async () => {
            const fixture = await montar(Dashboard);
            expect(fixture.nativeElement.querySelectorAll('app-status-sala-badge').length).toBe(3);
            verificar(fixture.nativeElement, '.schedule-item span, .schedule-item strong, .room-status-item strong, .room-status-item span, .room-status-item .badge, .room-group-title, .banner h2, .banner p');
        });

        it(`mantém as seis cores de disciplinas, cabeçalho e horários legíveis na grade (${tema})`, async () => {
            const fixture = await montar(GradeSemanal);
            verificar(fixture.nativeElement, '.etiqueta-materia:not(.cor-vazio), .cabecalho div, .coluna-horario span, .titulo');
        });

        it(`mantém todas as cores de aulas e avatares legíveis em Professores (${tema})`, async () => {
            const fixture = await montar(Professores);
            const element: HTMLElement = fixture.nativeElement;
            for (const card of Array.from(element.querySelectorAll<HTMLButtonElement>('.professor-card'))) {
                card.click();
                fixture.detectChanges();
                verificar(element, '.professor-card__nome, .professor-card__avatar');
                if (element.querySelector('.aula-card')) {
                    verificar(element, '.aula-card__horario span, .aula-card__info strong, .aula-card__info span');
                }
            }
        });

        it(`distingue equipamentos disponíveis, parciais e indisponíveis com contraste (${tema})`, async () => {
            document.documentElement.dataset['theme'] = tema;
            await TestBed.configureTestingModule({ imports: [EquipamentosCard] }).compileComponents();
            const fixture = TestBed.createComponent(EquipamentosCard);
            fixture.componentRef.setInput('equipamentos', [
                { tipo: 'Wi-Fi', quantidadeTotal: 1, quantidadeDisponivel: 1 },
                { tipo: 'Computador', quantidadeTotal: 30, quantidadeDisponivel: 27 },
                { tipo: 'Televisão', quantidadeTotal: 1, quantidadeDisponivel: 0 },
            ]);
            fixture.detectChanges();
            const element: HTMLElement = fixture.nativeElement;
            const disponivel = element.querySelector('.equipamento__quantidade--total')!;
            expect(disponivel.textContent?.trim()).toBe('1/1');
            expect(element.querySelector('.equipamento__quantidade--parcial')?.textContent?.trim()).toBe('27/30');
            expect(element.querySelector('.equipamento__quantidade--indisponivel')?.textContent?.trim()).toBe('0/1');
            verificar(element, '.equipamento__nome, .equipamento__quantidade');
        });
    }
});
