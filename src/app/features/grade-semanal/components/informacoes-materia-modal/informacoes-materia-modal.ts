import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    input,
    OnDestroy,
    output,
    viewChild,
} from '@angular/core';
import { AulaHorario, PROFESSOR_A_DEFINIR } from '../../../horarios/models/item-horario';
import { A_DEFINIR } from '../../../horarios/services/horarios';

/** Consulta da aula selecionada na matriz semanal (#169), sem alterar a grade. */
@Component({
    selector: 'app-informacoes-materia-modal',
    standalone: true,
    templateUrl: './informacoes-materia-modal.html',
    styleUrl: './informacoes-materia-modal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformacoesMateriaModal implements AfterViewInit, OnDestroy {
    readonly aula = input.required<AulaHorario>();
    readonly fechar = output<void>();

    private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
    protected readonly professor = computed(() =>
        this.valorInformado(this.aula().professor) || PROFESSOR_A_DEFINIR,
    );
    protected readonly sala = computed(() => this.valorInformado(this.aula().sala) || 'Sala a definir');

    ngAfterViewInit(): void {
        // showModal torna o restante da página inerte e coloca o diálogo sobre o overlay.
        this.dialogo().nativeElement.showModal();
    }

    ngOnDestroy(): void {
        this.dialogo().nativeElement.close();
    }

    protected fecharModal(): void {
        this.dialogo().nativeElement.close();
        this.fechar.emit();
    }

    protected cancelar(evento: Event): void {
        evento.preventDefault();
        this.fecharModal();
    }

    protected controlarFoco(evento: KeyboardEvent): void {
        if (evento.key !== 'Tab') return;
        const dialogo = this.dialogo().nativeElement;
        const botoes = dialogo.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        const primeiro = botoes[0];
        const ultimo = botoes[botoes.length - 1];
        const ativo = dialogo.ownerDocument.activeElement;
        if (evento.shiftKey && ativo === primeiro) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && ativo === ultimo) {
            evento.preventDefault();
            primeiro.focus();
        }
    }

    private valorInformado(valor: string): string {
        const texto = valor?.trim() ?? '';
        return texto === A_DEFINIR ? '' : texto;
    }
}
