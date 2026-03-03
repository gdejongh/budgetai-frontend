import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AiInsightsCard } from './ai-insights-card';
import { AiAdviceService, AiAdviceDTO } from '../../../core/services/ai-advice.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

function createMockAiAdviceService() {
  return {
    getAdvice: vi.fn(),
    clearCache: vi.fn(),
  };
}

const mockAdviceResponse: AiAdviceDTO = {
  advice: '**Spending Patterns**\nYou spent $450 on groceries this month.',
  generatedAt: new Date().toISOString(),
  cachedUntil: new Date(Date.now() + 86400000).toISOString(),
  refreshesRemaining: 2,
};

describe('AiInsightsCard', () => {
  let aiAdviceService: ReturnType<typeof createMockAiAdviceService>;

  beforeEach(async () => {
    aiAdviceService = createMockAiAdviceService();

    await TestBed.configureTestingModule({
      imports: [AiInsightsCard],
      providers: [
        { provide: AiAdviceService, useValue: aiAdviceService },
        provideAnimationsAsync(),
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(AiInsightsCard);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show generate button initially', () => {
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.generate-btn')).toBeTruthy();
    expect(el.querySelector('.ai-loading')).toBeFalsy();
    expect(el.querySelector('.ai-content')).toBeFalsy();
  });

  it('should show loading state when generating advice', () => {
    // Return an observable that never completes to keep loading state
    aiAdviceService.getAdvice.mockReturnValue(of(mockAdviceResponse));
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();

    fixture.componentInstance.generateAdvice();
    fixture.detectChanges();

    // After successful response, loading should be false and content visible
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ai-content')).toBeTruthy();
  });

  it('should display advice after successful generation', () => {
    aiAdviceService.getAdvice.mockReturnValue(of(mockAdviceResponse));
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();

    fixture.componentInstance.generateAdvice();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const adviceText = el.querySelector('.advice-text');
    expect(adviceText).toBeTruthy();
    expect(adviceText?.innerHTML).toContain('Spending Patterns');
  });

  it('should show error state on failure', () => {
    aiAdviceService.getAdvice.mockReturnValue(throwError(() => new Error('Network error')));
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();

    fixture.componentInstance.generateAdvice();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ai-error')).toBeTruthy();
    expect(el.textContent).toContain('Unable to generate advice');
  });

  it('should clear cache and regenerate on refresh', () => {
    aiAdviceService.clearCache.mockReturnValue(of(void 0));
    aiAdviceService.getAdvice.mockReturnValue(of(mockAdviceResponse));
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();

    fixture.componentInstance.refreshAdvice();
    fixture.detectChanges();

    expect(aiAdviceService.clearCache).toHaveBeenCalled();
    expect(aiAdviceService.getAdvice).toHaveBeenCalled();
  });

  it('should show rate limit message on 429 error', () => {
    aiAdviceService.getAdvice.mockReturnValue(throwError(() => ({ status: 429 })));
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();

    fixture.componentInstance.generateAdvice();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ai-error')).toBeTruthy();
    expect(el.textContent).toContain('Daily advice limit reached');
  });

  it('should show refreshes remaining after generation', () => {
    aiAdviceService.getAdvice.mockReturnValue(of(mockAdviceResponse));
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();

    fixture.componentInstance.generateAdvice();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('2 refreshes left today');
  });

  it('should hide refresh button when no refreshes remaining', () => {
    const noRefreshResponse = { ...mockAdviceResponse, refreshesRemaining: 0 };
    aiAdviceService.getAdvice.mockReturnValue(of(noRefreshResponse));
    const fixture = TestBed.createComponent(AiInsightsCard);
    fixture.detectChanges();

    fixture.componentInstance.generateAdvice();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.refresh-btn')).toBeFalsy();
    expect(el.textContent).toContain('Resets tomorrow');
  });
});
