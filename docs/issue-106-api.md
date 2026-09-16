# Issue 106 — Fluxo dinâmico de login

<!-- TEMPORÁRIO: excluir este aviso após integrar o backend e remover o modo demonstração. -->
> Exceção temporária: o desenvolvimento agora permite [login demonstrativo](modo-demonstracao.md)
> para acessar a dashboard sem API. As descrições abaixo se aplicam ao fluxo real,
> com `demoAuth` desligado. A demonstração não valida a integração nem o onboarding.

Implementação frontend de [documents#106](https://github.com/FATEC-AMS-PI-2026/documents/issues/106).

## Integração com o backend Java

O repositório `BackEnd-Java` estava vazio na implementação. O contrato abaixo é uma
proposta consumida pelos Services Angular, a ser implementada/alinhada com a API Java.
Não representa endpoints já disponíveis. Configure `apiUrl` nos arquivos de ambiente;
os endereços atuais continuam sendo os placeholders do projeto.

O frontend não acessa o banco diretamente. O backend autentica o usuário, consulta e
persiste seu perfil e calcula `configuracaoInicialConcluida` a partir dos registros
salvos. As escolhas em Signals são apenas rascunhos da tela; não substituem a persistência.

## Contrato HTTP

Todos os caminhos abaixo são relativos a `environment.apiUrl`. As chamadas de perfil
e catálogo enviam `Authorization: Bearer <token>`.

| Método | Caminho | Corpo / resposta |
| --- | --- | --- |
| POST | `/auth/login` | `{ identificador, senha }` → `{ token }` |
| POST | `/auth/cadastro` | `{ nome, email, senha }` → `{ token }`; cria conta e autentica |
| GET | `/usuarios/me/perfil` | `PerfilResponse` |
| GET | `/cursos` | `Course[]` |
| GET | `/cursos/{cursoId}` | `CursoDetalhes`, incluindo os períodos disponíveis |
| GET | `/cursos/{cursoId}/disciplinas?periodo=...` | `Disciplina[]` |
| PATCH | `/usuarios/me/perfil/periodo` | `{ periodo }` → `PerfilResponse`; preserva a grade existente |
| PUT | `/usuarios/me/perfil` | `{ cursoId, periodo, disciplinasIds }` → `PerfilResponse`; salva toda a configuração |

Os DTOs TypeScript estão em `features/profile-setup/models/profile.model.ts` e
`course.model.ts`. IDs são strings opacas e nomes/descrições vêm da API.

`PerfilResponse` contém:

- `usuario`: `{ nome: string, email: string, curso: string, periodo: string }`;
- `cursoId`: `string | null`;
- `disciplinasIds`: `string[]`;
- `configuracaoInicialConcluida`: `boolean` obrigatório, nunca deduzido do token ou do nome do curso.

No cadastro, retornar perfil não configurado, curso nulo, disciplinas vazias e textos
acadêmicos vazios. O PUT deve validar a relação curso/período/disciplinas, salvar a
grade e concluir a configuração em uma transação. O PATCH valida o período para o
curso já associado e não apaga nem substitui disciplinas. Respostas de gravação devem
retornar o perfil completo atualizado; erros usam códigos HTTP não 2xx.

O backend deve validar autenticação e autorização em cada endpoint. As proteções de
rota Angular apenas organizam a navegação. Habilitar CORS para a origem do frontend,
incluindo Authorization, Content-Type, GET, POST, PATCH, PUT e preflight OPTIONS.

## Jornadas

- Login: autentica e consulta o perfil antes de armazenar a sessão e navegar.
- Cadastro/primeiro acesso: curso → período → disciplinas → PUT → início.
- Retorno: período → PATCH → início. A grade existente é preservada.
- Alteração voluntária: o botão “Alterar disciplinas” confirma o período e abre a seleção.
- Falha de autenticação/consulta: não libera acesso nem mantém o perfil de outra conta.
- Falha de gravação: mantém a etapa e as escolhas para nova tentativa.
- Recarregar a página: consulta novamente o perfil pelo servidor. Rascunhos ainda não
  salvos são descartados; no retorno é necessário confirmar novamente o período.
- Acesso direto: exige autenticação, bloqueia o início durante o onboarding e exige
  confirmação do período no retorno.

Não há dados demonstrativos no fluxo de autenticação/onboarding. Fixtures existem
somente nos testes. Outras funcionalidades da aplicação não fazem parte desta issue.

## Referência visual e validação

Referências: [curso, frame 26:6](https://www.figma.com/design/pxpye92JRAD5Ah1ZEOyaS6/?node-id=26-6)
e [período, frame 26:8](https://www.figma.com/design/pxpye92JRAD5Ah1ZEOyaS6/?node-id=26-8).
Foi preservado o shell `ProfileSetup` / `SetupSidebar`. A etapa de disciplinas estende
os cards e tokens atuais para atender à issue; o frame de período consultado termina
no botão “Entrar no sistema”. No primeiro acesso esse botão agora leva às disciplinas.

Validação: build de produção e suíte Jasmine/Karma. Os testes verificam os contratos
HTTP, destinos condicionais, envio duplicado, falhas de API, gravação antes de navegar,
preservação de disciplinas no retorno e bloqueio de acesso direto. A integração ponta
a ponta com banco real depende da API Java.
