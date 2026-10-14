import { afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, inject, Injector, OnInit, signal } from '@angular/core';
import { HorariosService } from '../horarios/services/horarios';
import { AulaHorario, PROFESSOR_A_DEFINIR } from '../horarios/models/item-horario';
import { InformacoesMateriaModal } from './components/informacoes-materia-modal/informacoes-materia-modal';
import { ContextoGradeService } from './services/contexto-grade';

/** Mantido aqui por compatibilidade; a fonte é `item-horario.ts` (#150). */
export { PROFESSOR_A_DEFINIR };

/** A matriz e as informações de cada aula vêm do Service. */
@Component({
    selector: 'app-grade-semanal',
    standalone: true,
    imports: [InformacoesMateriaModal],
    templateUrl: './grade-semanal.html',
    styleUrl: './grade-semanal.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeSemanal implements OnInit {
    protected readonly horariosService = inject(HorariosService);
    protected readonly dias = this.horariosService.dias;
    protected readonly linhas = this.horariosService.linhas;
    protected readonly aulaSelecionada = signal<AulaHorario | null>(null);
    private botaoOrigem: HTMLElement | null = null;
    private readonly contexto = inject(ContextoGradeService);
    private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);

    constructor() {
        effect(() => {
            if (!this.horariosService.carregado() || this.horariosService.carregando()) return;
            const contexto = this.contexto.consumir(this.linhas());
            if (!contexto) return;
            afterNextRender(() => {
                const pagina = this.elemento.nativeElement;
                const tabela = pagina.querySelector<HTMLElement>('.tabela-scroll');
                if (tabela) tabela.scrollLeft = contexto.tabela;
                const botao = Array.from(pagina.querySelectorAll<HTMLElement>('[data-bloco]'))
                    .find(el => el.dataset['bloco'] === contexto.bloco);
                botao?.focus({ preventScroll: true });
                pagina.ownerDocument.defaultView?.scrollTo({ top: contexto.pagina, behavior: 'auto' });
            }, { injector: this.injector });
        });
    }

    ngOnInit(): void { this.horariosService.carregar(); }

    protected abrirInformacoes(aula: AulaHorario, evento: Event): void {
        this.botaoOrigem = evento.currentTarget as HTMLElement;
        // Preserva a aula clicada, inclusive quando a matéria se repete na semana.
        this.aulaSelecionada.set(aula);
    }

    protected fecharInformacoes(): void {
        this.aulaSelecionada.set(null);
        if (this.botaoOrigem?.isConnected) this.botaoOrigem.focus();
        this.botaoOrigem = null;
    }

    protected sairParaDetalhes(): void {
        const aula = this.aulaSelecionada(), bloco = this.botaoOrigem?.dataset['bloco'];
        if (aula && bloco) {
            const pagina = this.elemento.nativeElement;
            this.contexto.guardar(bloco, aula, pagina.querySelector('.tabela-scroll')?.scrollLeft ?? 0,
                pagina.ownerDocument.defaultView?.scrollY ?? 0);
        }
        this.fecharInformacoes();
    }

    protected professorDe(aula: AulaHorario): string {
        return aula.professor?.trim() || PROFESSOR_A_DEFINIR;
    }

    protected temProfessor(aula: AulaHorario): boolean {
        return !!aula.professor?.trim();
    }
}
