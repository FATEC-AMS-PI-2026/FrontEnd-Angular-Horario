import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    linkedSignal,
    output,
    signal,
} from '@angular/core';
import { HorariosService } from '../../services/horarios';
import { BlocoHorario, DiaSemana, DIAS_SEMANA } from '../../models/item-horario';

/**
 * Modal "Adicionar Matéria" (issue #104): o aluno escolhe o dia (chips Seg a
 * Sáb), a matéria (dropdown) e o bloco de horário (chips) e inclui a aula na
 * grade pessoal. Só fecha sozinho quando a aula foi adicionada com sucesso.
 *
 * O pai só renderiza o modal enquanto ele está aberto (`@if`), então cada
 * abertura começa com o formulário limpo — "Cancelar" não precisa resetar nada.
 */
@Component({
    selector: 'app-adicionar-materia-modal',
    standalone: true,
    templateUrl: './adicionar-materia-modal.html',
    styleUrl: './adicionar-materia-modal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '(document:keydown.escape)': 'fechar.emit()' },
})
export class AdicionarMateriaModal {
    private readonly horariosService = inject(HorariosService);

    /** Dia que já vem marcado ao abrir (o dia que o aluno estava vendo na tabela). */
    readonly diaInicial = input<DiaSemana | null>(null);

    /** Emitido ao cancelar, clicar fora ou apertar Esc. */
    readonly fechar = output<void>();

    /** Emitido com o dia da aula depois que ela foi adicionada. */
    readonly adicionada = output<DiaSemana>();

    protected readonly dias = DIAS_SEMANA;
    protected readonly materias = this.horariosService.materias;
    protected readonly blocos = this.horariosService.blocos;

    /** Começa no `diaInicial`, mas o aluno pode trocar pelos chips. */
    protected readonly dia = linkedSignal<DiaSemana | null>(() => this.diaInicial());
    protected readonly materia = signal('');
    protected readonly bloco = signal<BlocoHorario | null>(null);

    /** Só mostra os erros de campo depois da primeira tentativa de envio. */
    protected readonly tentouEnviar = signal(false);
    /** Erro devolvido pelo service (ex.: horário já ocupado). */
    protected readonly erroEnvio = signal<string | null>(null);

    protected readonly faltaDia = computed(() => this.tentouEnviar() && !this.dia());
    protected readonly faltaMateria = computed(() => this.tentouEnviar() && !this.materia());
    protected readonly faltaBloco = computed(() => this.tentouEnviar() && !this.bloco());

    constructor() {
        const host = inject<ElementRef<HTMLElement>>(ElementRef);
        // Leva o foco para dentro do modal, para teclado/leitor de tela começarem nele.
        afterNextRender(() => {
            host.nativeElement.querySelector<HTMLElement>('[role="dialog"]')?.focus();
        });
    }

    protected selecionarDia(dia: DiaSemana): void {
        this.dia.set(dia);
        this.erroEnvio.set(null);
    }

    protected selecionarMateria(materia: string): void {
        this.materia.set(materia);
        this.erroEnvio.set(null);
    }

    protected selecionarBloco(bloco: BlocoHorario): void {
        this.bloco.set(bloco);
        this.erroEnvio.set(null);
    }

    /** Rótulo do chip de horário no formato pedido na issue: "1ª - 13:20". */
    protected rotuloBloco(indice: number, bloco: BlocoHorario): string {
        return `${indice + 1}ª - ${bloco.inicio}`;
    }

    protected adicionar(): void {
        this.tentouEnviar.set(true);
        const dia = this.dia();
        const bloco = this.bloco();
        const materia = this.materia();
        if (!dia || !bloco || !materia) return;

        const resultado = this.horariosService.adicionarAula({ diaSemana: dia, materia, bloco });
        if (!resultado.ok) {
            this.erroEnvio.set(resultado.erro);
            return;
        }
        this.adicionada.emit(dia);
    }
}
