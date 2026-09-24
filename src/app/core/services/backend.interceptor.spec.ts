import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BACKEND_CONFIG, BackendConfig, BackendIndisponivelError } from './backend-config';
import { backendInterceptor } from './backend.interceptor';
import { ApiErrorService } from './api-error.service';

describe('Conexão futura com o backend', () => {
    let client: HttpClient;
    let http: HttpTestingController;
    let config: BackendConfig;
    beforeEach(() => {
        config = { habilitado: false, url: 'https://backend.test/api/' };
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([backendInterceptor])), provideHttpClientTesting(),
                { provide: BACKEND_CONFIG, useValue: config },
            ]
        });
        client = TestBed.inject(HttpClient);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    it('bloqueia operações remotas desativadas e apresenta orientação para os dados locais', () => {
        let erro: unknown;
        client.post('https://backend.test/api/auth/cadastro', {}).subscribe({ error: e => erro = e });
        expect(erro).toBeInstanceOf(BackendIndisponivelError);
        expect(TestBed.inject(ApiErrorService).mensagem(erro, 'Falha')).toContain('tela de cadastro');
        http.expectNone('https://backend.test/api/auth/cadastro');
    });

    it('continua permitindo importar o catálogo estático', () => {
        let recebido: unknown;
        client.get('dados/ads-ams-primeiro-ano.json').subscribe(valor => recebido = valor);
        http.expectOne('dados/ads-ams-primeiro-ano.json').flush({ versao: 1 });
        expect(recebido).toEqual({ versao: 1 });
    });

    it('permite a conexão habilitada preservando o token remoto', () => {
        config.habilitado = true;
        client.get('https://backend.test/api/cursos', {
            headers: new HttpHeaders({ Authorization: 'Bearer token-remoto' }),
        }).subscribe();
        const req = http.expectOne('https://backend.test/api/cursos');
        expect(req.request.headers.get('Authorization')).toBe('Bearer token-remoto');
        req.flush([]);
    });

    // TEMPORÁRIO: excluir este teste de tokens locais após integrar o backend Java.
    it('não envia identificadores locais ao servidor mesmo se habilitado', () => {
        config.habilitado = true;
        for (const token of ['gini-local:perfil']) {
            let erro: unknown;
            client.get('https://backend.test/api/cursos', {
                headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
            }).subscribe({ error: e => erro = e });
            expect(erro).toBeInstanceOf(BackendIndisponivelError);
        }
        http.expectNone('https://backend.test/api/cursos');
    });

    it('libera só os módulos já integrados enquanto o backend geral está desligado', () => {
        config.modulos = ['salas'];
        client.get('https://backend.test/api/salas?page=0').subscribe();
        http.expectOne('https://backend.test/api/salas?page=0').flush({});

        const erros: unknown[] = [];
        client.get('https://backend.test/api/salas-extras').subscribe({ error: e => erros.push(e) });
        client.get('https://backend.test/api/cursos').subscribe({ error: e => erros.push(e) });
        expect(erros.length).toBe(2);
        expect(erros.every(e => e instanceof BackendIndisponivelError)).toBeTrue();
        http.expectNone('https://backend.test/api/cursos');
    });

    it('delimita o caminho da API sem bloquear URLs de prefixo parecido', () => {
        client.get('https://backend.test/api-public/catalogo').subscribe();
        http.expectOne('https://backend.test/api-public/catalogo').flush({});
        let bloqueado = false;
        client.get('https://backend.test/api?pagina=1').subscribe({ error: () => bloqueado = true });
        expect(bloqueado).toBeTrue();
        http.expectNone('https://backend.test/api?pagina=1');
    });
});
