import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BACKEND_CONFIG } from '../../core/services/backend-config';
import { RelogioService } from '../salas/services/relogio';
import { Professores } from './professores';
import { ProfessoresService } from './services/professores';
import { ProfessoresLocaisService } from './services/professores-locais';
import { fonteProfessoresLocaisTeste } from './testing/professores-locais.fixture';
import { alocacaoApi, paginaApi, professorApi } from './testing/professores-api.fixture';
import { paraAulaProfessor } from './services/mapeadores-professores';

describe('Entrada em Professores pela rota do modal (#170)', () => {
    let http: HttpTestingController;
    beforeEach(() => {
        const locais = fonteProfessoresLocaisTeste();
        locais.professores.set([{ id: 'local-1', idLocal: 1, nome: 'Docente local', cargo: null }]);
        locais.aulas.set([{ ...paraAulaProfessor(alocacaoApi(), '2026-10-13')!,
            id: 'local-1', professorId: 'local-1', disciplina: 'Aula local',
        }]);
        TestBed.configureTestingModule({ providers: [
            provideRouter([{ path: 'professores', component: Professores }]),
            provideHttpClient(), provideHttpClientTesting(),
            { provide: BACKEND_CONFIG, useValue: { url: '/api', modulos: ['professores', 'alocacoes', 'cursos'], agendaSalasCompleta: false } },
            { provide: RelogioService, useValue: { agora: () => new Date('2026-10-13T12:00:00Z') } },
        ] }).overrideComponent(Professores, { set: { providers: [
            ProfessoresService, { provide: ProfessoresLocaisService, useValue: locais },
        ] } });
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    async function abrir(identificador: string) {
        const harness = await RouterTestingHarness.create(`/professores?professor=${identificador}`);
        http.expectOne('/api/cursos?page=0&size=200').flush(paginaApi([]));
        http.expectOne('/api/professores?page=0&size=200').flush(paginaApi([professorApi(1, 'Docente Java')]));
        harness.detectChanges();
        return harness;
    }

    it('seleciona o docente local correto com sua grade e atualiza a URL ao escolher outro', async () => {
        const harness = await abrir('local-1');
        expect(harness.routeNativeElement?.querySelector('.aulas-professor__titulo')?.textContent).toContain('Docente local');
        expect(harness.routeNativeElement?.querySelector('.aulas-professor')?.textContent).toContain('Aula local');
        expect(harness.routeNativeElement?.querySelector('.professores__voltar')?.getAttribute('href')).toBe('/grade-semanal');
        http.expectNone(r => r.url === '/api/alocacoes');
        const java = Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.professor-card'))
            .find(card => card.textContent?.includes('Docente Java'))!;
        java.click();
        http.expectOne(r => r.url === '/api/alocacoes' && r.params.get('id_usuario') === '1').flush(paginaApi([]));
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(TestBed.inject(Router).url).toBe('/professores?professor=1');
        expect(harness.routeNativeElement?.querySelector('.aulas-professor__titulo')?.textContent).toContain('Docente Java');
    });

    it('preserva a busca ao escolher outro professor depois de sair da entrada direta', async () => {
        const harness = await abrir('local-1');
        const busca = harness.routeNativeElement!.querySelector<HTMLInputElement>('input[type=search]')!;
        busca.value = 'Docente';
        busca.dispatchEvent(new Event('input'));
        await harness.fixture.whenStable();
        harness.detectChanges();
        const java = Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.professor-card'))
            .find(card => card.textContent?.includes('Docente Java'))!;
        java.click();
        http.expectOne(r => r.url === '/api/alocacoes' && r.params.get('id_usuario') === '1').flush(paginaApi([]));
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(busca.value).toBe('Docente');
        expect(TestBed.inject(Router).url).toBe('/professores');
        expect(harness.routeNativeElement?.querySelector('.aulas-professor__titulo')?.textContent).toContain('Docente Java');
    });

    it('não abre outro docente quando o identificador solicitado não existe', async () => {
        const harness = await abrir('local-99');
        expect(harness.routeNativeElement?.textContent).toContain('professor solicitado não está disponível');
        expect(harness.routeNativeElement?.querySelector('.aulas-professor')).toBeNull();
        expect(harness.routeNativeElement?.querySelector('[aria-pressed=true]')).toBeNull();
        http.expectNone(r => r.url === '/api/alocacoes');
    });
});
