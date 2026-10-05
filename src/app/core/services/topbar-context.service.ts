import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TopbarContextService {
  readonly sala = signal<string | null>(null);
}
