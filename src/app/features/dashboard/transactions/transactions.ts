import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateTransactionDialog } from './create-transaction-dialog';
import { SkeletonCard } from '../../../shared/components/skeleton-card/skeleton-card';
import {
  staggerFadeIn,
  slideInUp,
  scaleBounce,
} from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-transactions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    SkeletonCard,
  ],
  animations: [staggerFadeIn, slideInUp, scaleBounce],
  template: `
    <div class="page-header" @slideInUp>
      <div class="header-row">
        <div>
          <h1>Transactions</h1>
          <p>View and manage your financial transactions</p>
        </div>
        @if (!dashboardState.loading() && dashboardState.transactions().length > 0) {
          <div class="transaction-count glass-card glow-card">
            <span class="count-label">Total</span>
            <span class="count-value glow-text">{{ dashboardState.transactionCount() }}</span>
          </div>
        }
      </div>
    </div>

    @if (dashboardState.loading()) {
      <div class="transactions-list">
        <app-skeleton-card [count]="4" height="80px" />
      </div>
    } @else if (dashboardState.transactions().length === 0) {
      <div class="empty-state glass-card" @scaleBounce>
        <mat-icon>receipt_long</mat-icon>
        <h2>No transactions yet</h2>
        <p>Add your first transaction to start tracking your spending.</p>
        <button mat-flat-button color="primary" class="add-first-btn" (click)="openCreateDialog()">
          Add Your First Transaction
        </button>
      </div>
    } @else {
      <div class="transactions-list" @staggerFadeIn>
        @for (transaction of dashboardState.transactions(); track transaction.id) {
          <div class="transaction-card glass-card neon-border">
            <div class="transaction-icon-col">
              <div class="txn-icon" [class.income]="transaction.amount > 0">
                <mat-icon>{{ transaction.amount > 0 ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
              </div>
            </div>
            <div class="transaction-details">
              <span class="txn-description">{{ transaction.description || 'Untitled' }}</span>
              <div class="txn-meta">
                <span class="txn-account">{{ accountNameMap()[transaction.bankAccountId] || 'Unknown' }}</span>
                @if (transaction.envelopeId && envelopeNameMap()[transaction.envelopeId]) {
                  <span class="txn-separator">&middot;</span>
                  <span class="txn-envelope">{{ envelopeNameMap()[transaction.envelopeId] }}</span>
                }
                <span class="txn-separator">&middot;</span>
                <span class="txn-date">{{ transaction.transactionDate | date: 'mediumDate' }}</span>
              </div>
            </div>
            <div class="transaction-amount-col">
              <span class="txn-amount" [class.income]="transaction.amount > 0"
                                       [class.expense]="transaction.amount < 0">
                {{ transaction.amount | currency }}
              </span>
              <button mat-icon-button
                      class="delete-btn"
                      (click)="deleteTransaction(transaction.id!)"
                      [attr.aria-label]="'Delete transaction ' + (transaction.description || 'Untitled')">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <button mat-fab
            color="primary"
            class="fab-add"
            (click)="openCreateDialog()"
            aria-label="Add new transaction">
      <mat-icon>add</mat-icon>
    </button>

    @if (deletingId()) {
      <div class="confirm-overlay" (click)="cancelDelete()" @slideInUp role="dialog" aria-label="Confirm deletion">
        <div class="confirm-card glass-card" (click)="$event.stopPropagation()">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
          <h3>Delete Transaction?</h3>
          <p>This action cannot be undone.</p>
          <div class="confirm-actions">
            <button mat-button (click)="cancelDelete()">Cancel</button>
            <button mat-flat-button color="warn" (click)="confirmDelete()">
              <mat-icon>delete</mat-icon>
              Delete
            </button>
          </div>
        </div>
      </div>
    }
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

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .transaction-count {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 1rem 1.5rem;
      min-width: 100px;
    }

    .count-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .count-value {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .transactions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .transaction-card {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      gap: 1rem;
      transition: transform var(--transition-fast), box-shadow var(--transition-base);

      &:hover {
        transform: translateY(-1px);
      }
    }

    .transaction-icon-col {
      flex-shrink: 0;
    }

    .txn-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: rgba(248, 113, 113, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: var(--danger);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.income {
        background: rgba(52, 211, 153, 0.12);

        mat-icon {
          color: var(--success);
        }
      }
    }

    .transaction-details {
      flex: 1;
      min-width: 0;
    }

    .txn-description {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .txn-meta {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.2rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .txn-account {
      color: var(--accent-primary);
      font-weight: 500;
    }

    .txn-envelope {
      color: var(--accent-secondary, var(--text-secondary));
      font-weight: 500;
    }

    .transaction-amount-col {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .txn-amount {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      white-space: nowrap;

      &.income {
        color: var(--success);
      }

      &.expense {
        color: var(--danger);
      }
    }

    .delete-btn {
      color: var(--text-muted);
      opacity: 0;
      transition: opacity var(--transition-fast), color var(--transition-fast);

      .transaction-card:hover & {
        opacity: 1;
      }

      &:hover {
        color: var(--danger);
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
        max-width: 400px;
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
      }
    }

    .add-first-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .fab-add {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 10;
      box-shadow:
        0 4px 20px rgba(34, 211, 238, 0.3),
        0 0 40px rgba(34, 211, 238, 0.15);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        transform: scale(1.1);
        box-shadow:
          0 6px 30px rgba(34, 211, 238, 0.4),
          0 0 60px rgba(34, 211, 238, 0.2);
      }
    }

    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .confirm-card {
      padding: 2rem;
      text-align: center;
      max-width: 360px;

      .confirm-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--warning);
        margin-bottom: 1rem;
      }

      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
      }
    }

    .confirm-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }
  `,
})
export class Transactions implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly transactionApi = inject(TransactionControllerService);

  protected readonly deletingId = signal<string | null>(null);

  protected readonly accountNameMap = computed(() => {
    const map: Record<string, string> = {};
    for (const a of this.dashboardState.accounts()) {
      if (a.id) map[a.id] = a.name;
    }
    return map;
  });

  protected readonly envelopeNameMap = computed(() => {
    const map: Record<string, string> = {};
    for (const e of this.dashboardState.envelopes()) {
      if (e.id) map[e.id] = e.name;
    }
    return map;
  });

  ngOnInit(): void {
    if (this.dashboardState.transactions().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.loadTransactions();
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateTransactionDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dashboardState.addTransaction(result);
      }
    });
  }

  deleteTransaction(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    this.transactionApi.delete1(id).subscribe({
      next: () => {
        this.dashboardState.removeTransaction(id);
        this.deletingId.set(null);
      },
      error: () => {
        this.deletingId.set(null);
      },
    });
  }
}
