import { FigmaIcon } from '../../../../shared/components/figma-icon/figma-icon';
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
import { RouterLink } from '@angular/router';
import { AulaHorario, PROFESSOR_A_DEFINIR } from '../../../horarios/models/item-horario';
import { A_DEFINIR } from '../../../horarios/services/horarios';
import { idDaReferencia, referenciaAcademica, ReferenciaAcademica } from '../../../../shared/models/referencia-academica';

/** Consulta da aula selecionada na matriz semanal (#169), sem alterar a grade. */
@Component({
    selector: 'app-informacoes-materia-modal',
    standalone: true,
    imports: [RouterLink, FigmaIcon],
    templateUrl: './informacoes-materia-modal.html',
    styleUrl: './informacoes-materia-modal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformacoesMateriaModal implements AfterViewInit, OnDestroy {
    readonly aula = input.required<AulaHorario>();
    readonly fechar = output<void>();
    readonly navegar = output<void>();

    private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
    protected readonly professor = computed(() =>
        this.valorInformado(this.aula().professor) || PROFESSOR_A_DEFINIR,
    );
    protected readonly sala = computed(() => this.valorInformado(this.aula().sala) || 'Sala a definir');
    protected readonly professorId = computed(() => this.valorInformado(this.aula().professor)
        && this.professor() !== PROFESSOR_A_DEFINIR ? this.idConfirmado(this.aula().referencias?.professor) : null);
    protected readonly salaId = computed(() => this.valorInformado(this.aula().sala)
        && this.sala() !== 'Sala a definir' ? this.idConfirmado(this.aula().referencias?.sala) : null);

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

    protected abrirDetalhes(evento: MouseEvent): void {
        if (evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        this.dialogo().nativeElement.close();
        this.navegar.emit();
    }

    protected controlarFoco(evento: KeyboardEvent): void {
        if (evento.key !== 'Tab') return;
        const dialogo = this.dialogo().nativeElement;
        const botoes = dialogo.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
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

    private idConfirmado(referencia?: ReferenciaAcademica): string | null {
        return referencia && referenciaAcademica(referencia.origem, referencia.id) ? idDaReferencia(referencia) : null;
    }
}
