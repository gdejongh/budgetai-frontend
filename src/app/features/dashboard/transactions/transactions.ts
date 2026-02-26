import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-transactions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="page-header">
      <h1>Transactions</h1>
      <p>View and manage your financial transactions</p>
    </div>

    <div class="empty-state glass-card">
      <mat-icon>receipt_long</mat-icon>
      <h2>No transactions yet</h2>
      <p>Your transactions will appear here once you start adding them.</p>
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

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 4rem 2rem;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--success);
        margin-bottom: 1rem;
      }

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--text-secondary);
        max-width: 400px;
        font-size: 0.95rem;
      }
    }
  `
})
export class Transactions {}
