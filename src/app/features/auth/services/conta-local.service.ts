/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend Java.
 * Implementação exclusiva do armazenamento acadêmico e das contas locais no navegador.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BancoLocalService } from '../../dados-locais/services/banco-local.service';
import { CatalogoLocal, CatalogoSalvo, DadosLocaisError, PerfilLocal } from '../../dados-locais/models/catalogo-local';
import { validarCatalogo } from '../../dados-locais/services/validar-catalogo';

interface ContaLocal {
    perfilId: string;
    email: string;
    salt: number[];
    resumo: number[];
}

/** TEMPORÁRIO: substituir as contas deste navegador pela autenticação Java na integração.
 * Senhas nunca são gravadas em texto; este mecanismo não autentica identidade no servidor.
 */
@Injectable({ providedIn: 'root' })
export class ContaLocalService {
    private readonly banco = inject(BancoLocalService);
    private readonly http = inject(HttpClient);

    async prepararCatalogo(): Promise<void> {
        if (await this.banco.ler('catalogo-fixo-v2-professores')) return;
        const catalogo = validarCatalogo(await firstValueFrom(
            this.http.get<unknown>('dados/ads-ams-primeiro-ano.json'),
        ));
        await this.banco.executar<void>('readwrite', store => {
            const pedido = store.get('catalogo');
            pedido.onsuccess = () => {
                const anterior = pedido.result as CatalogoSalvo | undefined;
                // Preserva revisão e escolhas quando o catálogo da antiga importação já é o mesmo.
                if (JSON.stringify(anterior?.catalogo) !== JSON.stringify(catalogo)) {
                    // Alterar somente docentes/metadados não invalida as escolhas acadêmicas.
                    const mesmaGrade = anterior && this.estruturaGrade(anterior.catalogo) === this.estruturaGrade(catalogo);
                    store.put({ catalogo, revisao: mesmaGrade ? anterior.revisao : crypto.randomUUID(), importadoEm: new Date().toISOString() }, 'catalogo');
                }
                store.put(true, 'catalogo-fixo-v2-professores');
            };
        });
    }

    // TEMPORÁRIO: comparação para atualizar docentes locais sem apagar a configuração dos alunos.
    private estruturaGrade(catalogo: CatalogoLocal): string {
        return JSON.stringify({
            ...catalogo, atualizadoEm: '', fonte: undefined, professores: [],
            alocacoes: catalogo.alocacoes.map(aula => ({ ...aula, professorId: null })),
        });
    }

    async cadastrar(nome: string, email: string, senha: string): Promise<{ perfil: PerfilLocal; email: string }> {
        email = email.trim().toLowerCase();
        nome = nome.trim();
        if (nome.length < 3 || nome.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || senha.length < 8 || senha.length > 256) {
            throw new DadosLocaisError('Informe nome, e-mail válido e uma senha de 8 a 256 caracteres.');
        }
        const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
        const resumo = await this.resumir(senha, salt);
        await this.prepararCatalogo();
        let erro = '';
        const perfil = await this.banco.executar<PerfilLocal>('readwrite', (store, definir) => {
            const perfisReq = store.get('perfis');
            const contasReq = store.get('contas');
            contasReq.onsuccess = () => {
                const perfis = perfisReq.result as PerfilLocal[] ?? [];
                const contas = contasReq.result as ContaLocal[] ?? [];
                if (contas.some(c => c.email === email)) { erro = 'Conta já cadastrada'; return; }
                const novo: PerfilLocal = {
                    id: crypto.randomUUID(), nome, cursoId: null, periodo: null, ofertasIds: [], revisao: null,
                };
                store.put([...perfis, novo], 'perfis');
                store.put([...contas, { perfilId: novo.id, email, salt, resumo }], 'contas');
                definir(novo);
            };
        });
        if (erro) throw new DadosLocaisError(erro);
        return { perfil, email };
    }

    async entrar(email: string, senha: string): Promise<{ perfil: PerfilLocal; email: string }> {
        email = email.trim().toLowerCase();
        const contas = await this.banco.ler<ContaLocal[]>('contas') ?? [];
        const conta = contas.find(c => c.email === email);
        if (!conta || senha.length > 256) throw new DadosLocaisError('E-mail ou senha inválidos.');
        const resumo = await this.resumir(senha, conta.salt);
        if (resumo.some((b, i) => b !== conta.resumo[i])) throw new DadosLocaisError('E-mail ou senha inválidos.');
        await this.prepararCatalogo();
        const perfil = (await this.banco.ler<PerfilLocal[]>('perfis') ?? []).find(p => p.id === conta.perfilId);
        if (!perfil) throw new DadosLocaisError('Não foi possível encontrar o perfil desta conta.');
        return { perfil, email };
    }

    private async resumir(senha: string, salt: number[]): Promise<number[]> {
        if (!crypto.subtle) throw new DadosLocaisError('Abra o site por HTTPS ou localhost para usar contas neste navegador.');
        const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
        return Array.from(new Uint8Array(await crypto.subtle.deriveBits({
            name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations: 600000,
        }, chave, 256)));
    }
}
