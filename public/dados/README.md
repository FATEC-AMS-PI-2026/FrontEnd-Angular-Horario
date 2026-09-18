# Contas e grade neste navegador

> TEMPORÁRIO: o armazenamento acadêmico, as contas locais e o catálogo fixo serão removidos após integrar o backend Java.

Cada cadastro cria uma conta e um perfil novos. A associação com perfis antigos foi removida; contas já cadastradas continuam funcionando.

## Como usar

1. Execute `npm start` e abra o site.
2. No login, clique em **Criar uma conta**.
3. Preencha nome, e-mail, senha e confirmação. O cadastro abre a escolha de curso.
4. Escolha ADS AMS, **1º ano**, suas disciplinas e conclua para acessar a dashboard.
5. Para entrar novamente, use o mesmo e-mail e senha na tela de login. Confirme o período para acessar sua grade.

A grade fixa é carregada automaticamente a partir de `ads-ams-primeiro-ano.json`. Não existe mais uma tela para importar/exportar catálogos ou abrir perfis.

## O que fica salvo

O IndexedDB guarda contas, perfis e escolhas neste navegador e endereço. Fechar o site ou sair não apaga a conta. Outro navegador, computador ou endereço não compartilha esses dados; limpar os dados do site pode apagá-los.

A senha não é armazenada em texto: usamos PBKDF2/SHA-256, salt aleatório por conta e 600.000 iterações pela Web Crypto API. O site precisa de HTTPS ou localhost. Esse acesso local não equivale a autenticação em servidor e não verifica e-mail institucional ou matrícula. Não existe recuperação por e-mail enquanto o backend estiver ausente.

## Grade incluída

São 12 disciplinas e 30 aulas semanais da imagem Horário.png, para o primeiro ano do ADS AMS, curso anual de dois anos. O segundo ano não recebeu disciplinas inventadas. O calendário da Fatec Itu de 2026 contempla dias sem aula e reposições do turno vespertino. Professor, sala e demais informações ausentes continuam não informados.

A escolha de disciplinas valida conflitos de horário e impede selecionar duas turmas da mesma disciplina. DP e adiantamento continuam autodeclarados. A fonte local atende login/cadastro, profile-setup e dashboard; as outras páginas mantêm seu comportamento anterior.

## Código e GitHub

O código e o catálogo fixo acompanham o repositório. Cada pessoa cria a própria conta local; o banco do navegador e as senhas não entram no Git.

Services preservam a separação: ContaLocalService cuida do cadastro/login e inicialização do catálogo; BancoLocalService acessa o IndexedDB; DadosLocaisService fornece perfil, disciplinas e grade às telas. O nome interno dados-locais permanece apenas para os serviços/modelos; a página e a rota foram removidas.

## Backend futuro

A conexão continua desativada por `backendHabilitado: false`. O perfil remoto permanece separado em PerfilRemotoService. Ao integrar Java, substituir a autenticação local, alinhar os contratos de perfil/grade e mapear IDs. Não basta alterar a URL; contas locais não são enviadas automaticamente ao servidor. O modo de demonstração foi removido; o cadastro local é a única alternativa enquanto não houver integração.


## Lembrar de mim

No login, a opção começa desmarcada: a sessão fica na aba (sessionStorage). Marcada, a sessão fica persistida no navegador (localStorage). As contas e as escolhas acadêmicas permanecem no IndexedDB em ambos os casos. Sair encerra a sessão sem apagar a conta ou a grade.
