export interface Course {
    id: string;
    title: string;
    period: string;
    unit: string;
    type: string;
    category: 'Manhã' | 'Tarde' | 'Noite' | 'Tecnólogo';
    icon: string;
}