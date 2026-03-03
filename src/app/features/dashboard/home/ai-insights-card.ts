import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AiAdviceService, AiAdviceDTO } from '../../../core/services/ai-advice.service';
import { slideInUp, fadeIn } from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-ai-insights-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  animations: [slideInUp, fadeIn],
  template: `
    <div class="ai-card glass-card" @slideInUp>
      <div class="ai-header">
        <div class="ai-icon">
          <mat-icon>auto_awesome</mat-icon>
        </div>
        <div class="ai-title-group">
          <h2>AI Financial Insights</h2>
          <p>Powered by Claude &middot; Personalized to your budget</p>
        </div>
      </div>

      @if (!advice() && !loading() && !error()) {
        <div class="ai-cta">
          <p class="ai-description">
            Get personalized spending analysis, budget recommendations, and tips to reach your financial goals.
          </p>
          <button mat-flat-button class="generate-btn" (click)="generateAdvice()">
            <mat-icon>auto_awesome</mat-icon>
            Get AI Advice
          </button>
        </div>
      }

      @if (loading()) {
        <div class="ai-loading">
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <p>Analyzing your finances...</p>
        </div>
      }

      @if (error()) {
        <div class="ai-error">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
          <button mat-stroked-button (click)="generateAdvice()">
            <mat-icon>refresh</mat-icon>
            Try Again
          </button>
        </div>
      }

      @if (advice() && !loading()) {
        <div class="ai-content" @fadeIn>
          <div class="advice-text" [innerHTML]="formattedAdvice()"></div>
          <div class="ai-footer">
            <span class="ai-timestamp">
              <mat-icon>schedule</mat-icon>
              {{ timeAgo() }} &middot; {{ advice()!.refreshesRemaining }} refresh{{ advice()!.refreshesRemaining === 1 ? '' : 'es' }} left today
            </span>
            @if (advice()!.refreshesRemaining > 0) {
              <button mat-stroked-button class="refresh-btn" (click)="refreshAdvice()">
                <mat-icon>refresh</mat-icon>
                Refresh
              </button>
            } @else {
              <span class="rate-limit-note">Resets tomorrow</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .ai-card {
      padding: 1.5rem;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--accent-gradient);
      }
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .ai-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(129, 140, 248, 0.15));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        background: var(--accent-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    .ai-title-group {
      h2 {
        font-size: 1.05rem;
        font-weight: 600;
        margin: 0;
        letter-spacing: -0.01em;
      }

      p {
        font-size: 0.78rem;
        color: var(--text-muted);
        margin: 0.15rem 0 0;
      }
    }

    .ai-cta {
      text-align: center;
      padding: 0.75rem 0 0.25rem;
    }

    .ai-description {
      color: var(--text-secondary);
      font-size: 0.88rem;
      line-height: 1.5;
      margin-bottom: 1.25rem;
      max-width: 480px;
      margin-inline: auto;
    }

    .generate-btn {
      background: var(--accent-gradient);
      color: var(--bg-primary);
      font-weight: 600;
      padding: 0 1.5rem;
      height: 40px;
      border-radius: var(--radius-sm);

      mat-icon {
        margin-right: 0.35rem;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .ai-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 0;
      gap: 1rem;

      p {
        color: var(--text-secondary);
        font-size: 0.88rem;
      }
    }

    .loading-dots {
      display: flex;
      gap: 6px;

      span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent-primary);
        animation: dotPulse 1.4s ease-in-out infinite;

        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }

    @keyframes dotPulse {
      0%, 80%, 100% {
        opacity: 0.3;
        transform: scale(0.8);
      }
      40% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .ai-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 0;

      mat-icon {
        color: var(--danger);
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.88rem;
        text-align: center;
      }
    }

    .ai-content {
      padding-top: 0.25rem;
    }

    .advice-text {
      font-size: 0.88rem;
      line-height: 1.65;
      color: var(--text-primary);

      :first-child {
        margin-top: 0;
      }

      :last-child {
        margin-bottom: 0;
      }
    }

    :host ::ng-deep .advice-text {
      strong {
        color: var(--accent-primary);
        font-weight: 600;
      }

      p {
        margin: 0.5rem 0;
      }

      ol, ul {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
      }

      li {
        margin: 0.25rem 0;
      }
    }

    .ai-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
    }

    .ai-timestamp {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: var(--text-muted);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .refresh-btn {
      font-size: 0.8rem;
      height: 32px;
      padding: 0 0.75rem;
      border-color: var(--border-subtle);
      color: var(--text-secondary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 0.25rem;
      }

      &:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }
    }

    .rate-limit-note {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
    }
  `,
})
export class AiInsightsCard {
  private readonly aiAdviceService = inject(AiAdviceService);

  protected readonly advice = signal<AiAdviceDTO | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expanded = signal(true);

  protected formattedAdvice = () => {
    const raw = this.advice()?.advice;
    if (!raw) return '';
    return this.markdownToHtml(raw);
  };

  protected timeAgo = () => {
    const advice = this.advice();
    if (!advice?.generatedAt) return '';
    const generated = new Date(advice.generatedAt);
    const now = new Date();
    const diffMs = now.getTime() - generated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  generateAdvice(): void {
    this.loading.set(true);
    this.error.set(null);

    this.aiAdviceService.getAdvice().subscribe({
      next: (response) => {
        this.advice.set(response);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.status === 429
          ? 'Daily advice limit reached (3/day). Try again tomorrow.'
          : 'Unable to generate advice. Please try again later.';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  refreshAdvice(): void {
    this.loading.set(true);
    this.error.set(null);

    this.aiAdviceService.clearCache().subscribe({
      next: () => {
        this.aiAdviceService.getAdvice().subscribe({
          next: (response) => {
            this.advice.set(response);
            this.loading.set(false);
          },
          error: (err) => {
            const msg = err?.status === 429
              ? 'Daily advice limit reached (3/day). Try again tomorrow.'
              : 'Unable to refresh advice. Please try again later.';
            this.error.set(msg);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Unable to refresh advice. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Basic markdown-to-HTML converter for bold, lists, and paragraphs.
   * Keeps it lightweight — no heavy library needed.
   */
  private markdownToHtml(md: string): string {
    return md
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        const isOrdered = /^\d+\./.test(match.trim());
        const tag = isOrdered ? 'ol' : 'ul';
        return `<${tag}>${match}</${tag}>`;
      })
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[oul]|<li)/, '<p>')
      .replace(/(?<![>])$/, '</p>')
      .replace(/<p><\/p>/g, '');
  }
}
