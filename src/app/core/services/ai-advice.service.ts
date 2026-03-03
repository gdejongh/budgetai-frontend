import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BASE_PATH } from '../api/variables';

export interface AiAdviceDTO {
  advice: string;
  generatedAt: string;
  cachedUntil: string;
  refreshesRemaining: number;
}

@Injectable({ providedIn: 'root' })
export class AiAdviceService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH, { optional: true }) ?? 'http://localhost:8080';

  getAdvice(): Observable<AiAdviceDTO> {
    return this.http.post<AiAdviceDTO>(`${this.basePath}/api/ai/advice`, {});
  }

  clearCache(): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/api/ai/advice/cache`);
  }
}
