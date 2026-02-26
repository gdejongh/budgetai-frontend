import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Your financial overview at a glance</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon accounts-icon">
          <mat-icon>account_balance</mat-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">Bank Accounts</span>
          <span class="stat-value">--</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon envelopes-icon">
          <mat-icon>mail</mat-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">Envelopes</span>
          <span class="stat-value">--</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon transactions-icon">
          <mat-icon>receipt_long</mat-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">Transactions</span>
          <span class="stat-value">--</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon balance-icon">
          <mat-icon>savings</mat-icon>
        </div>
        <div class="stat-info">
          <span class="stat-label">Total Balance</span>
          <span class="stat-value">--</span>
        </div>
      </div>
    </div>

    <div class="empty-state glass-card">
      <mat-icon>rocket_launch</mat-icon>
      <h2>Welcome to BudgetAI</h2>
      <p>Get started by adding your bank accounts and setting up envelopes to organize your budget.</p>
    </div>
  `,
  styles: `
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
      transition: border-color var(--transition-fast);

      &:hover {
        border-color: var(--border-default);
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
      }
    }
  `
})
export class Home {}
