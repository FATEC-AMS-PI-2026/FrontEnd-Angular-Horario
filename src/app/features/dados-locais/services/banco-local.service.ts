/**
 * TEMPORÁRIO: excluir este arquivo inteiro após integrar o backend Java.
 * Implementação exclusiva do armazenamento acadêmico e das contas locais no navegador.
 */
import { Injectable, InjectionToken, inject } from '@angular/core';
import { DadosLocaisError } from '../models/catalogo-local';

export const NOME_BANCO_LOCAL = new InjectionToken<string>('NOME_BANCO_LOCAL', {
    providedIn: 'root', factory: () => 'gini-academico-v1',
});

/** Único ponto que conhece IndexedDB. Conclui a Promise apenas após o commit. */
@Injectable({ providedIn: 'root' })
export class BancoLocalService {
    private readonly nome = inject(NOME_BANCO_LOCAL);

    async executar<T>(modo: IDBTransactionMode,
        operacao: (store: IDBObjectStore, definir: (resultado: T) => void) => void): Promise<T> {
        const banco = await this.abrir();
        return new Promise<T>((resolve, reject) => {
            const transacao = banco.transaction('dados', modo);
            let resultado: T;
            const falhar = () => {
                banco.close(); reject(new DadosLocaisError(
                    'Não foi possível acessar o armazenamento. Confira o espaço e as permissões do navegador.'));
            };
            transacao.oncomplete = () => { banco.close(); resolve(resultado); };
            transacao.onabort = falhar;
            transacao.onerror = () => { /* onabort informa a falha e mantém a transação atômica. */ };
            try { operacao(transacao.objectStore('dados'), valor => resultado = valor); }
            catch (error) { transacao.abort(); banco.close(); reject(error); }
        });
    }

    ler<T>(chave: string): Promise<T | undefined> {
        return this.executar<T | undefined>('readonly', (store, definir) => {
            const pedido = store.get(chave);
            pedido.onsuccess = () => definir(pedido.result as T | undefined);
        });
    }

    private abrir(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new DadosLocaisError('Este navegador não oferece armazenamento local.')); return;
            }
            const pedido = indexedDB.open(this.nome, 1);
            let bloqueado = false;
            pedido.onupgradeneeded = () => { pedido.result.createObjectStore('dados'); };
            pedido.onerror = () => reject(new DadosLocaisError('Não foi possível abrir o banco local.'));
            pedido.onblocked = () => { bloqueado = true; reject(new DadosLocaisError('Feche outras abas do site e tente novamente.')); };
            pedido.onsuccess = () => {
                if (bloqueado) { pedido.result.close(); return; }
                pedido.result.onversionchange = () => pedido.result.close();
                resolve(pedido.result);
            };
        });
    }
}
