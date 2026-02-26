import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (item of items(); track $index) {
      <div class="skeleton-card" [style.height]="height()">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line subtitle"></div>
        <div class="skeleton-line value"></div>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .skeleton-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    .skeleton-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(34, 211, 238, 0.04) 20%,
        rgba(129, 140, 248, 0.08) 50%,
        rgba(34, 211, 238, 0.04) 80%,
        transparent 100%
      );
      animation: shimmer 2s ease-in-out infinite;
    }

    .skeleton-line {
      background: rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-sm);
      height: 14px;

      &.title {
        width: 60%;
        margin-bottom: 0.75rem;
        height: 18px;
      }

      &.subtitle {
        width: 40%;
        margin-bottom: 1rem;
      }

      &.value {
        width: 50%;
        height: 24px;
      }
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `,
})
export class SkeletonCard {
  readonly count = input(3);
  readonly height = input('140px');

  protected readonly items = () => Array.from({ length: this.count() });
}
