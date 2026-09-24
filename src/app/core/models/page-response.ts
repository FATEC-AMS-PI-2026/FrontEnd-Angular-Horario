/** Envelope das listagens paginadas do backend Java (`PageResponse<T>`). */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
