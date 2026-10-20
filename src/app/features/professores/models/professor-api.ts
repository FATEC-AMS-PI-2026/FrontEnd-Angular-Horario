/** Contrato do cadastro Java: não contém cargo nem curso. */
export interface ProfessorApi {
    id: number;
    nome: string;
    email: string;
    cidade: string | null;
    status: 'ATIVO' | 'INATIVO';
}
