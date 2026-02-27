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
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';

import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateTransactionDialog } from './create-transaction-dialog';
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
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
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
          <div class="transaction-card glass-card neon-border" [attr.data-txn-id]="transaction.id">
            <div class="transaction-icon-col">
              <button class="txn-icon-btn"
                      [class.income]="transaction.amount > 0"
                      (click)="toggleAmountSign(transaction)"
                      [attr.aria-label]="transaction.amount > 0 ? 'Change to withdrawal' : 'Change to deposit'">
                <mat-icon>{{ transaction.amount > 0 ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
              </button>
            </div>
            <div class="transaction-details">
              <div class="editable-field description-field">
                <label class="sr-only" [attr.for]="'txn-desc-' + transaction.id">Transaction description</label>
                <input [id]="'txn-desc-' + transaction.id"
                       class="inline-input description-input"
                       type="text"
                       [value]="transaction.description || ''"
                       placeholder="Untitled"
                       (blur)="onDescriptionBlur($event, transaction)"
                       (keydown.enter)="blurTarget($event)"
                       (keydown.escape)="revertAndBlur($event, transaction.description || '')"
                       aria-label="Transaction description" />
              </div>
              <div class="txn-meta">
                <mat-form-field class="inline-mat-field account-field" appearance="fill" subscriptSizing="dynamic">
                  <mat-select [value]="transaction.bankAccountId"
                              (selectionChange)="onAccountChange($event, transaction)"
                              aria-label="Bank account"
                              panelClass="dark-select-panel">
                    @for (account of dashboardState.accounts(); track account.id) {
                      <mat-option [value]="account.id">{{ account.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <span class="txn-separator">&middot;</span>
                <mat-form-field class="inline-mat-field envelope-field" appearance="fill" subscriptSizing="dynamic">
                  <mat-select [value]="transaction.envelopeId || ''"
                              (selectionChange)="onEnvelopeChange($event, transaction)"
                              aria-label="Envelope"
                              panelClass="dark-select-panel">
                    <mat-option value="">None</mat-option>
                    @for (envelope of dashboardState.envelopes(); track envelope.id) {
                      <mat-option [value]="envelope.id">{{ envelope.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <span class="txn-separator">&middot;</span>
                <label class="sr-only" [attr.for]="'txn-date-' + transaction.id">Transaction date</label>
                <input [id]="'txn-date-' + transaction.id"
                       class="inline-input date-input"
                       type="date"
                       [value]="transaction.transactionDate"
                       (change)="onDateChange($event, transaction)"
                       (blur)="onDateChange($event, transaction)"
                       aria-label="Transaction date" />
              </div>
            </div>
            <div class="transaction-amount-col">
              <div class="editable-field amount-field">
                <span class="currency-prefix"
                      [class.income]="transaction.amount > 0"
                      [class.expense]="transaction.amount < 0">
                  {{ transaction.amount >= 0 ? '+$' : '-$' }}
                </span>
                <label class="sr-only" [attr.for]="'txn-amount-' + transaction.id">Transaction amount</label>
                <input [id]="'txn-amount-' + transaction.id"
                       class="inline-input amount-input"
                       [class.income]="transaction.amount > 0"
                       [class.expense]="transaction.amount < 0"
                       type="number"
                       step="0.01"
                       min="0.01"
                       [value]="absAmount(transaction.amount)"
                       (blur)="onAmountBlur($event, transaction)"
                       (keydown.enter)="blurTarget($event)"
                       (keydown.escape)="revertAndBlur($event, absAmount(transaction.amount).toString())"
                       aria-label="Transaction amount" />
              </div>
              <button mat-icon-button
                      class="delete-btn"
                      (click)="deleteTransaction(transaction.id!)"
                      [attr.aria-label]="'Delete transaction ' + (transaction.description || 'Untitled')">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>

            @if (savingId() === transaction.id) {
              <div class="save-indicator" @fadeIn>
                <mat-icon>sync</mat-icon>
              </div>
            }
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
      transition: transform var(--transition-fast), box-shadow var(--transition-base);

      &:hover {
        transform: translateY(-1px);
      }
    }

    .transaction-icon-col {
      flex-shrink: 0;
    }

    .txn-icon-btn {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: rgba(248, 113, 113, 0.12);
      border: 1px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color var(--transition-fast), background var(--transition-fast);

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

      &:hover {
        border-color: var(--border-hover, rgba(255, 255, 255, 0.2));
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
      }
    }

    .transaction-details {
      flex: 1;
      min-width: 0;
    }

    /* --- Inline editing shared styles --- */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .editable-field {
      display: flex;
      align-items: center;
    }

    .inline-input {
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm, 4px);
      color: inherit;
      font-family: inherit;
      padding: 2px 4px;
      transition: border-color var(--transition-fast), background var(--transition-fast);

      &:hover {
        border-color: var(--border-hover, rgba(255, 255, 255, 0.15));
      }

      &:focus {
        outline: none;
        border-color: var(--accent-primary);
        background: rgba(255, 255, 255, 0.05);
      }
    }

    /* --- Compact inline mat-form-field for selects --- */
    .inline-mat-field {
      width: auto;
      max-width: 130px;

      ::ng-deep {
        .mat-mdc-form-field-subscript-wrapper {
          display: none;
        }

        .mdc-text-field--filled {
          background: transparent !important;
          padding: 0 4px !important;
          height: auto !important;
          min-height: unset !important;
        }

        .mat-mdc-form-field-infix {
          padding: 2px 0 !important;
          min-height: unset !important;
          border: none;
        }

        .mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-line-ripple::before {
          border-bottom-color: transparent;
        }

        .mdc-text-field--filled:hover:not(.mdc-text-field--disabled) .mdc-line-ripple::before {
          border-bottom-color: var(--border-hover, rgba(255, 255, 255, 0.15));
        }

        .mat-mdc-select {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .mat-mdc-select-arrow-wrapper {
          transform: scale(0.7);
        }

        .mat-mdc-form-field-focus-overlay {
          opacity: 0 !important;
        }
      }
    }

    .account-field ::ng-deep .mat-mdc-select-value-text {
      color: var(--accent-primary);
    }

    .envelope-field ::ng-deep .mat-mdc-select-value-text {
      color: var(--accent-secondary, var(--text-secondary));
    }

    .description-input {
      display: block;
      width: 100%;
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.01em;

      &::placeholder {
        color: var(--text-muted);
        font-weight: 400;
      }
    }

    .txn-meta {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.2rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }



    .date-input {
      font-size: 0.8rem;
      color: var(--text-muted);
      max-width: 130px;

      &::-webkit-calendar-picker-indicator {
        filter: invert(0.6);
        cursor: pointer;
      }
    }

    .transaction-amount-col {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .amount-field {
      gap: 0;
    }

    .currency-prefix {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;

      &.income {
        color: var(--success);
      }

      &.expense {
        color: var(--danger);
      }
    }

    .amount-input {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      width: 80px;
      text-align: right;

      /* Hide number spinners */
      -moz-appearance: textfield;
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

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

    .save-indicator {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--accent-primary);
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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
  `,
})
export class Transactions implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly transactionApi = inject(TransactionControllerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly deletingId = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);

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

  /** Returns the absolute value of an amount for display in the amount input */
  absAmount(amount: number): number {
    return Math.abs(amount);
  }

  /** Blur the input on Enter key */
  blurTarget(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  /** Revert input value and blur on Escape key */
  revertAndBlur(event: Event, originalValue: string): void {
    const input = event.target as HTMLInputElement;
    input.value = originalValue;
    input.blur();
  }

  // ---- Inline edit handlers ----

  onDescriptionBlur(event: Event, transaction: TransactionDTO): void {
    const input = event.target as HTMLInputElement;
    const newDesc = input.value.trim();
    // Allow empty — will display as "Untitled" placeholder
    if (newDesc === (transaction.description || '')) return;
    const updated: TransactionDTO = { ...transaction, description: newDesc || undefined };
    this.saveTransaction(transaction, updated, input);
  }

  onAmountBlur(event: Event, transaction: TransactionDTO): void {
    const input = event.target as HTMLInputElement;
    const parsed = parseFloat(input.value);
    if (isNaN(parsed) || parsed <= 0) {
      input.value = this.absAmount(transaction.amount).toString();
      return;
    }
    // Preserve existing sign
    const sign = transaction.amount >= 0 ? 1 : -1;
    const newAmount = sign * parsed;
    if (newAmount === transaction.amount) return;
    const updated: TransactionDTO = { ...transaction, amount: newAmount };
    this.saveTransaction(transaction, updated, input);
  }

  toggleAmountSign(transaction: TransactionDTO): void {
    const newAmount = -transaction.amount;
    const updated: TransactionDTO = { ...transaction, amount: newAmount };
    this.saveTransaction(transaction, updated);
  }

  onAccountChange(event: MatSelectChange, transaction: TransactionDTO): void {
    const newAccountId = event.value as string;
    if (newAccountId === transaction.bankAccountId) return;
    const updated: TransactionDTO = { ...transaction, bankAccountId: newAccountId };
    this.saveTransaction(transaction, updated);
  }

  onEnvelopeChange(event: MatSelectChange, transaction: TransactionDTO): void {
    const newEnvelopeId = (event.value as string) || undefined;
    if (newEnvelopeId === transaction.envelopeId) return;
    const updated: TransactionDTO = { ...transaction, envelopeId: newEnvelopeId };
    this.saveTransaction(transaction, updated);
  }

  onDateChange(event: Event, transaction: TransactionDTO): void {
    const input = event.target as HTMLInputElement;
    const newDate = input.value; // Already YYYY-MM-DD from type="date"
    if (!newDate || newDate === transaction.transactionDate) return;
    const updated: TransactionDTO = { ...transaction, transactionDate: newDate };
    this.saveTransaction(transaction, updated, input);
  }

  // ---- Save with optimistic update + rollback ----

  private saveTransaction(
    original: TransactionDTO,
    updated: TransactionDTO,
    inputEl?: HTMLInputElement,
  ): void {
    const id = original.id!;
    this.savingId.set(id);

    // Optimistic update (adjusts balances immediately)
    this.dashboardState.updateTransaction(id, original, updated);

    this.transactionApi.update1(id, updated).subscribe({
      next: (saved) => {
        // Reconcile with server response
        this.dashboardState.updateTransaction(id, updated, saved);
        this.savingId.set(null);
      },
      error: () => {
        // Rollback: reverse the optimistic update
        this.dashboardState.updateTransaction(id, updated, original);

        // Revert input value (mat-selects revert automatically via signal-driven [value])
        if (inputEl) {
          if (inputEl.type === 'number') {
            inputEl.value = this.absAmount(original.amount).toString();
          } else if (inputEl.type === 'date') {
            inputEl.value = original.transactionDate;
          } else {
            inputEl.value = original.description || '';
          }
        }

        this.savingId.set(null);
      },
    });
  }

  // ---- Delete flow ----

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

  clearFilter(): void {
    this.router.navigate(['/dashboard/transactions']);
  }
}
