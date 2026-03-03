import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { DashboardStateService } from '../dashboard-state.service';
import { Counter } from '../../../shared/components/counter/counter';
import { SkeletonCard } from '../../../shared/components/skeleton-card/skeleton-card';
import { AiInsightsCard } from './ai-insights-card';
import { staggerFadeIn, slideInUp, scaleBounce } from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    Counter,
    SkeletonCard,
    AiInsightsCard,
  ],
  animations: [staggerFadeIn, slideInUp, scaleBounce],
  template: `
    <div class="page-header" @slideInUp>
      <h1>Dashboard</h1>
      <p>Your financial overview at a glance</p>
    </div>

    @if (state.loading()) {
      <div class="stats-grid">
        <app-skeleton-card [count]="4" height="100px" />
      </div>
    } @else {
      <div class="stats-grid" @staggerFadeIn>
        <div class="stat-card glow-card">
          <div class="stat-icon accounts-icon">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Bank Accounts</span>
            <span class="stat-value">{{ state.accountCount() }}</span>
          </div>
        </div>

        <div class="stat-card glow-card">
          <div class="stat-icon balance-icon">
            <mat-icon>savings</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Balance</span>
            <span class="stat-value glow-text">
              <app-counter [targetValue]="state.totalBankBalance()" />
            </span>
          </div>
        </div>

        <div class="stat-card glow-card">
          <div class="stat-icon envelopes-icon">
            <mat-icon>mail</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-label">Allocated</span>
            <span class="stat-value">
              <app-counter [targetValue]="state.totalEnvelopeAllocation()" />
            </span>
          </div>
        </div>

        <div class="stat-card"
               [class.glow-card]="state.unallocatedAmount() === 0"
               [class.pulse-warning]="state.unallocatedAmount() > 0"
               [class.negative-card]="state.unallocatedAmount() < 0">
            <div class="stat-icon"
                 [class.unallocated-icon]="state.unallocatedAmount() > 0"
                 [class.transactions-icon]="state.unallocatedAmount() === 0"
                 [class.negative-icon]="state.unallocatedAmount() < 0">
              <mat-icon>
                {{ state.unallocatedAmount() < 0 ? 'error' : (state.unallocatedAmount() > 0 ? 'warning_amber' : 'check_circle') }}
              </mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-label">Unallocated</span>
              <span class="stat-value"
                    [class.warn-value]="state.unallocatedAmount() > 0"
                    [class.negative-value]="state.unallocatedAmount() < 0">
                <app-counter [targetValue]="state.unallocatedAmount()" />
              </span>
            </div>
          </div>
      </div>

      @if (state.accountCount() > 0) {
        <app-ai-insights-card />
      }

      @if (state.accountCount() === 0) {
        <div class="empty-state glass-card" @scaleBounce>
          <mat-icon>rocket_launch</mat-icon>
          <h2>Welcome to BudgetAI</h2>
          <p>Get started by adding your bank accounts and setting up envelopes to organize your budget.</p>
          <a mat-flat-button color="primary" routerLink="/dashboard/accounts" class="cta-btn">
            <mat-icon>add</mat-icon>
            Add Your First Account
          </a>
        </div>
      } @else {
        <div class="quick-actions" @slideInUp>
          <h2 class="section-title">Quick Actions</h2>
          <div class="actions-grid">
            <a routerLink="/dashboard/accounts" class="action-card glass-card neon-border">
              <mat-icon>account_balance</mat-icon>
              <span>Manage Accounts</span>
            </a>
            <a routerLink="/dashboard/envelopes" class="action-card glass-card neon-border">
              <mat-icon>mail</mat-icon>
              <span>Manage Envelopes</span>
            </a>
            <a routerLink="/dashboard/transactions" class="action-card glass-card neon-border">
              <mat-icon>receipt_long</mat-icon>
              <span>View Transactions</span>
            </a>
          </div>
        </div>
      }
    }
  `,
  styles: `
        .negative-card {
          border-color: var(--danger);
          background: rgba(239, 68, 68, 0.08);
          box-shadow: 0 0 0 2px var(--danger), 0 2px 8px 0 rgba(239, 68, 68, 0.08);
          animation: shake 0.3s;
        }

        .negative-icon {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
        }

        .negative-value {
          color: var(--danger);
        }

        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-2px); }
          40% { transform: translateX(2px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
    .page-header {
      margin-bottom: 2rem;

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: 0.25rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.95rem;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      transition: border-color var(--transition-fast), transform var(--transition-fast);

      &:hover {
        border-color: var(--border-default);
        transform: translateY(-1px);
      }
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      &.accounts-icon {
        background: rgba(34, 211, 238, 0.12);
        color: var(--accent-primary);
      }

      &.envelopes-icon {
        background: rgba(129, 140, 248, 0.12);
        color: var(--accent-secondary);
      }

      &.transactions-icon {
        background: rgba(52, 211, 153, 0.12);
        color: var(--success);
      }

      &.balance-icon {
        background: rgba(251, 191, 36, 0.12);
        color: var(--warning);
      }

      &.unallocated-icon {
        background: rgba(251, 191, 36, 0.15);
        color: var(--warning);
      }
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .warn-value {
      color: var(--warning);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem 2rem;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--accent-primary);
        margin-bottom: 1rem;
      }

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--text-secondary);
        max-width: 480px;
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
      }
    }

    .cta-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 1rem;
      letter-spacing: -0.01em;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem;
      text-decoration: none;
      color: var(--text-primary);
      transition: transform var(--transition-fast);
      cursor: pointer;

      &:hover {
        transform: translateY(-3px);
        text-decoration: none;
      }

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--accent-primary);
      }

      span {
        font-size: 0.9rem;
        font-weight: 500;
      }
    }
  `,
})
export class Home implements OnInit {
  protected readonly state = inject(DashboardStateService);

  ngOnInit(): void {
    // Data is loaded by the layout, but refresh if empty and not loading
    if (this.state.accounts().length === 0 && !this.state.loading()) {
      this.state.refresh();
    }
  }
}
