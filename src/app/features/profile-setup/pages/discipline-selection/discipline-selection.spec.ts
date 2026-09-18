import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DisciplineSelection } from './discipline-selection';
import { ProfileSetupService } from '../../services/profile-setup.service';
import { Disciplina } from '../../models/profile.model';
import { environment } from '../../../../../environments/environment';

describe('DisciplineSelection: grade personalizada', () => {
    let component: DisciplineSelection;
    let fixture: ComponentFixture<DisciplineSelection>;
    let http: HttpTestingController;
    let setup: ProfileSetupService;
    let navigate: jasmine.Spy;
    const base = environment.apiUrl;
    const matriz: Disciplina[] = [
        { id: 'dp', nome: 'Algoritmos', periodo: '1º semestre' },
        { id: 'regular', nome: 'Programação orientada a objetos', periodo: '2º semestre' },
        { id: 'regular-2', nome: 'Banco de dados', periodo: '2º semestre' },
        { id: 'futura', nome: 'Sistemas distribuídos', periodo: '3º semestre' },
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [DisciplineSelection],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
        setup = TestBed.inject(ProfileSetupService);
        setup.setCourse('ADS', 'ads');
        setup.setPeriod('2º semestre');
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(DisciplineSelection);
        component = fixture.componentInstance;
        navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    function carregar(disciplinas = matriz): void {
        http.expectOne(base + '/cursos/ads').flush({
            periodicidade: 'Semestral', periodos: ['1º semestre', '2º semestre', '3º semestre'],
        });
        const request = http.expectOne(base + '/cursos/ads/disciplinas');
        expect(request.request.params.has('periodo')).toBeFalse();
        request.flush(disciplinas);
        fixture.detectChanges();
    }

    it('filtra anos, classifica DP e adiciona todas somente do ano escolhido', () => {
        setup.setPeriod('2º ano');
        component.filtroPeriodo.set('2º ano');
        http.expectOne(base + '/cursos/ads').flush({
            periodicidade: 'Anual', periodos: ['1º ano', '2º ano'],
        });
        http.expectOne(base + '/cursos/ads/disciplinas').flush([
            { id: 'dp', nome: 'Algoritmos', periodo: '1º ano' },
            { id: 'regular', nome: 'Banco de dados', periodo: '2º ano' },
        ]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('h2').textContent).toContain('seu ano');
        expect(component.visiveis().map(d => d.id)).toEqual(['regular']);
        component.adicionarTodas();
        component.filtroPeriodo.set('1º ano');
        component.adicionarTodas();
        expect(setup.selectedDisciplinas()).toEqual(['regular', 'dp']);
        expect(component.resumo()).toEqual({ regular: 1, dp: 1, adiantamento: 0 });
        component.concluir();
        const pedido = http.expectOne(base + '/usuarios/me/perfil');
        expect(pedido.request.body).toEqual({ cursoId: 'ads', periodo: '2º ano', disciplinasIds: ['regular', 'dp'] });
        pedido.flush({ usuario: { nome: 'Ana', email: '', curso: 'ADS', periodo: '2º ano' },
            cursoId: 'ads', disciplinasIds: ['regular', 'dp'], configuracaoInicialConcluida: true });
        expect(navigate).toHaveBeenCalledOnceWith(['/dashboard']);
    });

    it('abre com a grade do período exato selecionado, sem limitar a consulta da matriz', () => {
        carregar();
        expect(component.visiveis().map(item => item.id)).toEqual(['regular', 'regular-2']);
        expect(component.selecionadas()).toEqual([]);
        expect(setup.currentStep()).toBe(4);
    });

    it('adiciona o período inteiro apesar da busca, sem duplicar ou remover escolhas anteriores', () => {
        carregar();
        component.selecionar('dp');
        component.selecionar('regular');
        component.busca.set('programacao');
        fixture.detectChanges();
        const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
        buttons.find(button => button.textContent?.includes('Adicionar todas'))!.click();
        expect(setup.selectedDisciplinas()).toEqual(['dp', 'regular', 'regular-2']);
        expect(component.podeAdicionarTodas()).toBeFalse();
        component.adicionarTodas();
        expect(setup.selectedDisciplinas().length).toBe(3);
        component.filtroPeriodo.set('3º semestre');
        expect(component.podeAdicionarTodas()).toBeTrue();
        component.adicionarTodas();
        expect(setup.selectedDisciplinas()).toEqual(['dp', 'regular', 'regular-2', 'futura']);
    });

    it('não adiciona em todos os períodos, durante carregamento ou gravação', () => {
        component.adicionarTodas();
        expect(setup.selectedDisciplinas()).toEqual([]);
        carregar();
        component.filtroPeriodo.set(null);
        component.adicionarTodas();
        expect(component.podeAdicionarTodas()).toBeFalse();
        expect(setup.selectedDisciplinas()).toEqual([]);
        component.filtroPeriodo.set('2º semestre');
        component.saving.set(true);
        component.adicionarTodas();
        expect(setup.selectedDisciplinas()).toEqual([]);
    });

    it('combina regular, DP e adiantamento e mantém seleção ao trocar filtros', () => {
        carregar();
        component.selecionar('regular');
        component.filtroPeriodo.set('1º semestre');
        component.selecionar('dp');
        component.filtroPeriodo.set('3º semestre');
        component.selecionar('futura');
        expect(component.resumo()).toEqual({ regular: 1, dp: 1, adiantamento: 1 });
        expect(component.selecionadas().length).toBe(3);
        fixture.detectChanges();
        const resumo = fixture.nativeElement.querySelector('.resumo') as HTMLElement;
        expect(resumo.textContent).toContain('Algoritmos');
        expect(resumo.textContent).toContain('Sistemas distribuídos');
    });

    it('busca por nome sem diferenciar acentos e preserva escolhas ocultas', () => {
        carregar();
        component.selecionar('dp');
        component.busca.set('programacao');
        expect(component.visiveis().map(item => item.id)).toEqual(['regular']);
        component.filtroPeriodo.set(null);
        component.busca.set('nao existe');
        expect(component.visiveis()).toEqual([]);
        expect(component.selecionadas().map(item => item.id)).toEqual(['dp']);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Nenhuma disciplina encontrada');
    });

    it('permite remover pelo resumo uma disciplina que não está no filtro atual', () => {
        carregar();
        component.selecionar('dp');
        fixture.detectChanges();
        const remover = fixture.nativeElement.querySelector('[aria-label="Remover Algoritmos"]');
        remover.click();
        expect(component.selecionadas()).toEqual([]);
    });

    it('envia todos os IDs de vários períodos e navega somente depois da gravação', () => {
        carregar();
        component.selecionar('regular');
        component.selecionar('dp');
        component.selecionar('futura');
        component.concluir();
        component.concluir();
        const request = http.expectOne(base + '/usuarios/me/perfil');
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({
            cursoId: 'ads', periodo: '2º semestre', disciplinasIds: ['regular', 'dp', 'futura'],
        });
        expect(navigate).not.toHaveBeenCalled();
        request.flush({
            usuario: { nome: 'Ana', email: 'ana@example.test', curso: 'ADS', periodo: '2º semestre' },
            cursoId: 'ads', disciplinasIds: ['regular', 'dp', 'futura'],
            configuracaoInicialConcluida: true,
        });
        expect(navigate).toHaveBeenCalledOnceWith(['/dashboard']);
        expect(component.saving()).toBeFalse();
    });

    it('impede concluir sem seleção, durante carregamento e com catálogo vazio', () => {
        component.concluir();
        carregar([]);
        component.concluir();
        http.expectNone(base + '/usuarios/me/perfil');
        expect(navigate).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('Ainda não há disciplinas');
    });

    it('falha de salvamento mantém seleção e permite tentar novamente', () => {
        carregar();
        component.selecionar('dp');
        component.concluir();
        http.expectOne(base + '/usuarios/me/perfil')
            .flush({}, { status: 503, statusText: 'Unavailable' });
        expect(component.errorMessage()).toContain('Suas escolhas foram mantidas');
        expect(component.selecionadas().map(item => item.id)).toEqual(['dp']);
        expect(component.saving()).toBeFalse();
        expect(navigate).not.toHaveBeenCalled();
        component.concluir();
        http.expectOne(base + '/usuarios/me/perfil')
            .flush({}, { status: 503, statusText: 'Unavailable' });
    });

    it('exibe erro de API sem inventar disciplinas e permite recarregar', () => {
        http.expectOne(base + '/cursos/ads').flush({ periodicidade: 'Semestral', periodos: ['2º semestre'] });
        http.expectOne(base + '/cursos/ads/disciplinas')
            .flush({}, { status: 500, statusText: 'Error' });
        expect(component.carregado()).toBeFalse();
        expect(component.disciplinas()).toEqual([]);
        component.carregar();
        carregar();
        expect(component.carregado()).toBeTrue();
    });

    it('trata matriz incompatível como falha recuperável sem apagar o rascunho', () => {
        setup.definirDisciplinas(['dp']);
        http.expectOne(base + '/cursos/ads').flush({ periodicidade: 'Semestral', periodos: ['2º semestre'] });
        http.expectOne(base + '/cursos/ads/disciplinas').flush({ content: [] });
        expect(component.loading()).toBeFalse();
        expect(component.carregado()).toBeFalse();
        expect(component.errorMessage()).toContain('Não foi possível');
        expect(setup.selectedDisciplinas()).toEqual(['dp']);
    });

    it('rejeita vínculo com período desconhecido e impede salvar', () => {
        carregar([{ id: 'invalida', nome: 'Sem vínculo', periodo: '99º semestre' }]);
        expect(component.carregado()).toBeFalse();
        expect(component.errorMessage()).toContain('matriz do curso está incompleta');
        component.concluir();
        http.expectNone(base + '/usuarios/me/perfil');
    });

    it('restaura seleções de outros períodos e informa remoção de IDs indisponíveis', () => {
        setup.definirDisciplinas(['dp', 'futura', 'removida']);
        carregar();
        expect(component.selecionadas().map(item => item.id)).toEqual(['dp', 'futura']);
        expect(component.avisoSelecao()).toContain('removidas');
    });

    it('voltar e mudar período mantém disciplinas que agora podem ser DP ou adiantamento', () => {
        carregar();
        component.selecionar('regular');
        component.voltar();
        expect(navigate).toHaveBeenCalledOnceWith(['/setup/period-selection']);
        setup.setPeriod('3º semestre');
        expect(setup.selectedDisciplinas()).toEqual(['regular']);
        expect(component.tipo(matriz[1])).toBe('DP');
    });

    it('não permite alterar seleção durante a gravação', () => {
        carregar();
        component.selecionar('regular');
        component.concluir();
        component.selecionar('regular');
        expect(setup.selectedDisciplinas()).toEqual(['regular']);
        http.expectOne(base + '/usuarios/me/perfil')
            .flush({}, { status: 500, statusText: 'Error' });
    });
});
