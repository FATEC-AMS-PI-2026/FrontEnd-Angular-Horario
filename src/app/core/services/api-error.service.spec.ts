import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorService } from './api-error.service';

describe('ApiErrorService: contrato Java/Spring', () => {
    const service = new ApiErrorService();
    const falha = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

    it('mostra erros de validação do Java e remove mensagens repetidas', () => {
        expect(service.mensagem(falha(422, {
            error: 'Erro de validação', message: 'Erro de validação nos campos enviados',
            errors: ['Nome é obrigatório', 'Email inválido', 'Nome é obrigatório', null],
        }), 'Falha')).toBe('Nome é obrigatório Email inválido');
    });

    it('usa message para erro de regra de negócio', () => {
        expect(service.mensagem(falha(409, {
            error: 'Erro de regra de negócio', message: 'E-mail já cadastrado.',
        }), 'Falha')).toBe('E-mail já cadastrado.');
    });

    it('não mostra detalhes de banco, HTML ou erros internos', () => {
        for (const error of [falha(500, { message: 'stack trace' }),
        falha(400, { error: 'Erro de banco de dados', message: 'SQL SELECT senha' }),
        falha(502, '<html>Bad gateway</html>'), new Error('stack trace')]) {
            expect(service.mensagem(error, 'Falha segura')).toBe('Falha segura');
        }
    });

    it('diferencia conexão, credenciais, sessão, permissão e excesso de tentativas', () => {
        expect(service.mensagem(falha(0), '')).toContain('conectar');
        expect(service.mensagem(falha(401), '', true)).toContain('senha inválidos');
        expect(service.mensagem(falha(401), '')).toContain('sessão expirou');
        expect(service.mensagem(new HttpErrorResponse({
            status: 401,
            url: 'http://localhost:3000/api/usuarios/me/perfil'
        }), '', true)).toContain('sessão expirou');
        expect(service.mensagem(falha(403), '')).toContain('permissão');
        expect(service.mensagem(falha(429), '')).toContain('Muitas tentativas');
    });
});
