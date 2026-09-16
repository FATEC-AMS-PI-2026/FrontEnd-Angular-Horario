<!-- TEMPORÁRIO: excluir este documento após integrar o backend e remover o modo demonstração. -->
# Acesso temporário de demonstração

Inicie o Angular com `npm start` e abra a tela de login.

| Conta | E-mail | Senha | Caminho |
| --- | --- | --- | --- |
| Primeiro acesso | `primeiro@gini.local` | `Demo123!` | Login → curso → período → dashboard |
| Reentrada | `demo@gini.local` | `Demo123!` | Login → confirmar período → dashboard |

Cada login reinicia o cenário da conta escolhida, sem herdar escolhas de outra conta.
A primeira conta sempre começa sem curso nem período. A segunda começa com curso
e período demonstrativos preenchidos, mas exige confirmar o período antes de entrar.
Atualizar a página preserva as escolhas e a conclusão da sessão atual; sair as apaga.
As duas jornadas terminam no período, sem seleção de disciplinas, conforme solicitado.
Cursos e períodos locais são apenas exemplos para demonstração, não dados oficiais.
Cadastro e outras operações de API continuam dependendo do backend.

O acesso depende de `demoAuth: true` e `production: false`, configurados no ambiente
de desenvolvimento. Em produção ele fica bloqueado, inclusive para uma sessão
demonstrativa que tenha sido salva anteriormente.

## Remoção após integrar o backend

Procure por `TEMPORÁRIO` nos arquivos envolvidos:

1. Exclua `demo-auth.service.ts`, `demo-auth.service.spec.ts` e `demo-profile.service.ts`.
2. Remova a importação, a dependência e o desvio demonstrativo no `AuthService`.
3. Remova a importação e o bloco demonstrativo no `profileGuard`.
4. Remova `demoAuth` dos dois arquivos de ambiente.
5. Exclua este documento e o aviso temporário em `issue-106-api.md`.
6. Remova os blocos temporários do `ProfileSetupService`, a limpeza demo no
   `SessionService` e as condições demo na página de período e na `SetupSidebar`.

Esta é uma exceção temporária, autorizada, ao requisito sem mocks da issue 106.
