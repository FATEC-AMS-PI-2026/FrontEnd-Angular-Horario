export const environment = {
    production: false,
    // Habilitar somente após alinhar e testar os contratos com o Java.
    backendHabilitado: false,
    // Backend Java da turma 2025-2026 (PI-AMS-2025-2026/backend-java), rodando
    // localmente. As rotas dele não têm prefixo /api (ex.: GET /salas).
    apiUrl: 'http://localhost:8080',
    // Módulos já integrados ao Java, liberados mesmo com `backendHabilitado`
    // desligado (que continua controlando login/perfil). Ver issue #132.
    modulosBackend: ['salas'],
    linksSistema: {
        sobre: 'https://github.com/FATEC-AMS-PI-2026/FrontEnd-Angular-Horario#readme',
        suporte: 'https://github.com/FATEC-AMS-PI-2026/documents/issues/new',
        // Preencher quando os documentos oficiais do GINI forem publicados.
        privacidade: '',
        termos: '',
    },
};
