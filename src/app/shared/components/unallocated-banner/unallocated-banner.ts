import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { Counter } from '../../../shared/components/counter/counter';
import { pulseGlow } from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-unallocated-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatButtonModule, Counter],
  animations: [pulseGlow],
  template: `
    <div class="banner" @pulseGlow role="status">
      <div class="banner-glow"></div>
      <div class="banner-content">
        <div class="banner-icon-wrap">
          <mat-icon class="banner-icon">account_balance_wallet</mat-icon>
        </div>
        <div class="banner-text">
          <span class="banner-title">Unallocated Funds</span>
          <span class="banner-message">
            You have
            <strong class="banner-amount">
              <app-counter [targetValue]="amount()" [duration]="1000" />
            </strong>
            not assigned to any envelope.
          </span>
        </div>
        <div class="banner-actions">
          <a mat-flat-button
             color="primary"
             routerLink="/dashboard/envelopes"
             class="allocate-btn"
             (click)="allocate.emit()">
            <mat-icon>mail</mat-icon>
            Allocate Now
          </a>
          <button mat-icon-button
                  class="dismiss-btn"
                  (click)="dismiss.emit()"
                  aria-label="Dismiss unallocated funds notification">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 1.5rem;
    }

    .banner {
      position: relative;
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: linear-gradient(
        135deg,
        rgba(251, 191, 36, 0.08) 0%,
        rgba(248, 113, 113, 0.06) 50%,
        rgba(129, 140, 248, 0.06) 100%
      );
      border: 1px solid rgba(251, 191, 36, 0.3);
      animation: pulse-glow-border 2.5s ease-in-out infinite;
    }

    .banner-glow {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(251, 191, 36, 0.06) 25%,
        rgba(248, 113, 113, 0.08) 50%,
        rgba(251, 191, 36, 0.06) 75%,
        transparent 100%
      );
      animation: sweep 3s ease-in-out infinite;
    }

    .banner-content {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      z-index: 1;
    }

    .banner-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: rgba(251, 191, 36, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      animation: icon-pulse 2s ease-in-out infinite;
    }

    .banner-icon {
      color: var(--warning);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .banner-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .banner-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      color: var(--warning);
    }

    .banner-message {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .banner-amount {
      color: var(--warning);
      font-weight: 700;
      font-size: 1rem;
      text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
    }

    .banner-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .allocate-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      white-space: nowrap;
      font-size: 0.85rem;
    }

    .dismiss-btn {
      color: var(--text-muted);

      &:hover {
        color: var(--text-secondary);
      }
    }

    @keyframes sweep {
      0%, 100% {
        transform: translateX(-100%);
        opacity: 0;
      }
      50% {
        transform: translateX(100%);
        opacity: 1;
      }
    }

    @keyframes icon-pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    @media (max-width: 600px) {
      .banner-content {
        flex-wrap: wrap;
      }

      .banner-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `,
})
export class UnallocatedBanner {
  readonly amount = input.required<number>();
  readonly dismiss = output<void>();
  readonly allocate = output<void>();
}
