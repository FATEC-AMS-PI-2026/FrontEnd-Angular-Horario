export const environment = {
    production: false,
    // Habilitar somente após alinhar e testar os contratos com o Java.
    backendHabilitado: false,
    // O ng serve encaminha /api ao Java local pela mesma origem do Angular.
    // proxy.conf.json remove o prefixo: /api/salas -> http://127.0.0.1:8080/salas.
    apiUrl: '/api',
    // Módulos já integrados ao Java, liberados mesmo com `backendHabilitado`
    // desligado (que continua controlando login/perfil). Ver issue #132.
    // `turmas` (#150) dá 500 no Postgres (bug lower(bytea) do backend); nesse caso o
    // TurmasHorariosApiService deduz as turmas de `alocacoes`. No H2 funciona direto.
    modulosBackend: ['salas', 'alocacoes', 'recursos-salas', 'turmas'],
    // Requer Java no perfil dev com app.security.authorization.enabled=false.
    // Desativar se /alocacoes passar a restringir os resultados por curso.
    agendaSalasCompleta: true,
    linksSistema: {
        sobre: 'https://github.com/FATEC-AMS-PI-2026/FrontEnd-Angular-Horario#readme',
        suporte: 'https://github.com/FATEC-AMS-PI-2026/documents/issues/new',
        // Preencher quando os documentos oficiais do GINI forem publicados.
        privacidade: '',
        termos: '',
    },
};
