import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  signal,
  effect,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateTransactionDialog } from './create-transaction-dialog';
import {
  EditTransactionDialog,
  EditTransactionDialogResult,
} from './edit-transaction-dialog';
import { SkeletonCard } from '../../../shared/components/skeleton-card/skeleton-card';
import {
  staggerFadeIn,
  slideInUp,
  scaleBounce,
  fadeIn,
} from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-transactions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    SkeletonCard,
  ],
  animations: [staggerFadeIn, slideInUp, scaleBounce, fadeIn],
  template: `
    <div class="page-header" @slideInUp>
      <div class="header-row">
        <div>
          <h1>Transactions</h1>
          <p>View and manage your financial transactions</p>
        </div>
        @if (!dashboardState.loading() && dashboardState.transactions().length > 0) {
          <div class="transaction-count glass-card glow-card">
            <span class="count-label">{{ isFiltered() ? 'Showing' : 'Total' }}</span>
            <span class="count-value glow-text">{{ isFiltered() ? filteredTransactions().length : dashboardState.transactionCount() }}</span>
          </div>
        }
      </div>
    </div>

    @if (filterLabel()) {
      <div class="filter-bar glass-card" @fadeIn>
        <mat-icon class="filter-bar-icon">filter_list</mat-icon>
        <span class="filter-bar-label">{{ filterLabel() }}</span>
        <button mat-icon-button class="filter-bar-clear" (click)="clearFilter()" aria-label="Clear filter">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }

    @if (dashboardState.loading()) {
      <div class="transactions-list">
        <app-skeleton-card [count]="4" height="80px" />
      </div>
    } @else if (filteredTransactions().length === 0) {
      @if (filterLabel()) {
        <div class="empty-state glass-card" @scaleBounce>
          <mat-icon>filter_list_off</mat-icon>
          <h2>No matching transactions</h2>
          <p>There are no transactions matching this filter.</p>
          <button mat-flat-button color="primary" (click)="clearFilter()">Clear Filter</button>
        </div>
      } @else {
        <div class="empty-state glass-card" @scaleBounce>
          <mat-icon>receipt_long</mat-icon>
          <h2>No transactions yet</h2>
          <p>Add your first transaction to start tracking your spending.</p>
          <button mat-flat-button color="primary" class="add-first-btn" (click)="openCreateDialog()">
            Add Your First Transaction
          </button>
        </div>
      }
    } @else {
      <div class="transactions-list" @staggerFadeIn>
        @for (transaction of filteredTransactions(); track transaction.id) {
          <div class="transaction-card glass-card neon-border"
               [attr.data-txn-id]="transaction.id"
               tabindex="0"
               role="button"
               [attr.aria-label]="'Edit transaction: ' + (transaction.description || 'Untitled') + ', ' + (transaction.amount >= 0 ? '+' : '-') + '$' + absAmount(transaction.amount)"
               (click)="openEditDialog($event, transaction)"
               (keydown.enter)="openEditDialog($event, transaction)">
            <div class="transaction-icon-col">
              <div class="txn-icon-indicator"
                   [class.income]="transaction.amount > 0">
                <mat-icon>{{ transaction.amount > 0 ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
              </div>
            </div>
            <div class="transaction-details">
              <span class="txn-description">{{ transaction.description || 'Untitled' }}</span>
              <div class="txn-meta">
                <span class="txn-account-tag">{{ accountNameMap()[transaction.bankAccountId] || 'Unknown' }}</span>
                <span class="txn-separator">&middot;</span>
                <span class="txn-envelope-tag">{{ transaction.envelopeId ? (envelopeNameMap()[transaction.envelopeId] || 'Unknown') : 'No envelope' }}</span>
                <span class="txn-separator">&middot;</span>
                <span class="txn-date">{{ formatDate(transaction.transactionDate) | date:'MMM d, yyyy' }}</span>
              </div>
            </div>
            <div class="transaction-amount-col">
              <span class="txn-amount"
                    [class.income]="transaction.amount > 0"
                    [class.expense]="transaction.amount < 0">
                {{ transaction.amount >= 0 ? '+$' : '-$' }}{{ absAmount(transaction.amount) | number:'1.2-2' }}
              </span>
              <button mat-icon-button
                      class="delete-btn"
                      (click)="deleteTransaction($event, transaction.id!)"
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
      position: relative;
      cursor: pointer;
      transition: transform var(--transition-fast), box-shadow var(--transition-base);

      &:hover {
        transform: translateY(-1px);
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
      }
    }

    .transaction-icon-col {
      flex-shrink: 0;
    }

    .txn-icon-indicator {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: rgba(248, 113, 113, 0.12);
      border: 1px solid transparent;
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
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .txn-meta {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .txn-account-tag {
      color: var(--accent-primary);
      font-weight: 500;
    }

    .txn-envelope-tag {
      color: var(--accent-secondary, var(--text-secondary));
      font-weight: 500;
    }

    .txn-date {
      color: var(--text-muted);
    }

    .txn-separator {
      color: var(--text-muted);
      user-select: none;
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

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem 0.5rem 1rem;
      margin-bottom: 1.25rem;
      max-width: fit-content;
    }

    .filter-bar-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent-primary);
    }

    .filter-bar-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .filter-bar-clear {
      width: 28px;
      height: 28px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .highlight-pulse {
      animation: highlightPulse 2s ease-out !important;
    }

    @keyframes highlightPulse {
      0%, 15% {
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.6), 0 0 20px rgba(34, 211, 238, 0.3);
      }
      100% {
        box-shadow: none;
      }
    }

    /* --- Mobile responsive --- */
    @media (max-width: 600px) {
      .transaction-card {
        padding: 0.75rem 1rem;
        gap: 0.75rem;
      }

      .txn-description {
        font-size: 0.9rem;
      }

      .txn-meta {
        font-size: 0.75rem;
        gap: 0.3rem;
      }

      .txn-amount {
        font-size: 0.95rem;
      }

      .txn-icon-indicator {
        width: 36px;
        height: 36px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .delete-btn {
        opacity: 1;
      }
    }

    /* Touch devices: always show delete button */
    @media (hover: none) {
      .delete-btn {
        opacity: 1;
      }
    }
  `,
})
export class Transactions implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly transactionApi = inject(TransactionControllerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly deletingId = signal<string | null>(null);

  private readonly queryParams = toSignal(this.route.queryParamMap);

  protected readonly filterBankAccountId = computed(() =>
    this.queryParams()?.get('bankAccountId') ?? null
  );

  protected readonly filterEnvelopeId = computed(() =>
    this.queryParams()?.get('envelopeId') ?? null
  );

  private readonly highlightId = computed(() =>
    this.queryParams()?.get('highlightId') ?? null
  );

  protected readonly filteredTransactions = computed(() => {
    const txns = this.dashboardState.transactions();
    const bankAccountId = this.filterBankAccountId();
    const envelopeId = this.filterEnvelopeId();
    if (bankAccountId) return txns.filter(t => t.bankAccountId === bankAccountId);
    if (envelopeId) return txns.filter(t => t.envelopeId === envelopeId);
    return txns;
  });

  protected readonly isFiltered = computed(() =>
    !!this.filterBankAccountId() || !!this.filterEnvelopeId()
  );

  protected readonly filterLabel = computed(() => {
    const bankAccountId = this.filterBankAccountId();
    const envelopeId = this.filterEnvelopeId();
    if (bankAccountId) {
      const name = this.accountNameMap()[bankAccountId];
      return name ? `Account: ${name}` : 'Filtered by account';
    }
    if (envelopeId) {
      const name = this.envelopeNameMap()[envelopeId];
      return name ? `Envelope: ${name}` : 'Filtered by envelope';
    }
    return null;
  });

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

  constructor() {
    effect(() => {
      const id = this.highlightId();
      if (!id) return;
      setTimeout(() => {
        const el = document.querySelector(`[data-txn-id="${id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
          this.router.navigate([], {
            queryParams: { highlightId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      }, 300);
    });
  }

  ngOnInit(): void {
    if (this.dashboardState.transactions().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.loadTransactions();
    }
  }

  /** Returns the absolute value of an amount for display */
  absAmount(amount: number): number {
    return Math.abs(amount);
  }

  /** Parse a YYYY-MM-DD string into a Date for the DatePipe */
  formatDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // ---- Dialogs ----

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

  openEditDialog(event: Event, transaction: TransactionDTO): void {
    // Prevent the edit dialog from opening when clicking the delete button
    const target = event.target as HTMLElement;
    if (target.closest('.delete-btn')) return;

    const dialogRef = this.dialog.open(EditTransactionDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
      data: { transaction },
    });

    dialogRef.afterClosed().subscribe((result: EditTransactionDialogResult | undefined) => {
      if (result) {
        this.dashboardState.updateTransaction(result.saved.id!, result.original, result.saved);
      }
    });
  }

  // ---- Delete flow ----

  deleteTransaction(event: Event, id: string): void {
    event.stopPropagation();
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    this.transactionApi.deleteTransaction(id).subscribe({
      next: () => {
        this.dashboardState.removeTransaction(id);
        this.deletingId.set(null);
      },
      error: () => {
        this.deletingId.set(null);
      },
    });
  }

  clearFilter(): void {
    this.router.navigate(['/dashboard/transactions']);
  }
}
