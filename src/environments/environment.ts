export const environment = {
    production: true,
    // Habilitar somente após alinhar e testar os contratos com o Java.
    backendHabilitado: false,
    apiUrl: 'https://sua-api-de-producao.com/api',
    // Módulos já integrados ao Java (ver environment.development.ts).
    modulosBackend: [] as string[],
    linksSistema: {
        sobre: 'https://github.com/FATEC-AMS-PI-2026/FrontEnd-Angular-Horario#readme',
        suporte: 'https://github.com/FATEC-AMS-PI-2026/documents/issues/new',
        // Preencher quando os documentos oficiais do GINI forem publicados.
        privacidade: '',
        termos: '',
    },
};
