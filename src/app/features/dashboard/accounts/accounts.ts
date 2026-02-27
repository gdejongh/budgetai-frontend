import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { BankAccountControllerService } from '../../../core/api/api/bankAccountController.service';
import { BankAccountDTO } from '../../../core/api/model/bankAccountDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateAccountDialog } from './create-account-dialog';
import { Counter } from '../../../shared/components/counter/counter';
import { SkeletonCard } from '../../../shared/components/skeleton-card/skeleton-card';
import {
  staggerFadeIn,
  slideInUp,
  scaleBounce,
  fadeIn,
} from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-accounts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    Counter,
    SkeletonCard,
  ],
  animations: [staggerFadeIn, slideInUp, scaleBounce, fadeIn],
  template: `
    <div class="page-header" @slideInUp>
      <div class="header-row">
        <div>
          <h1>Bank Accounts</h1>
          <p>Manage your linked bank accounts</p>
        </div>
        @if (!dashboardState.loading() && dashboardState.accounts().length > 0) {
          <div class="total-balance glass-card glow-card">
            <span class="total-label">Total Balance</span>
            <span class="total-value glow-text">
              <app-counter [targetValue]="dashboardState.totalBankBalance()" />
            </span>
          </div>
        }
      </div>
    </div>

    @if (dashboardState.loading()) {
      <div class="accounts-grid">
        <app-skeleton-card [count]="3" height="180px" />
      </div>
    } @else if (dashboardState.accounts().length === 0) {
      <div class="empty-state glass-card" @scaleBounce>
        <mat-icon>account_balance</mat-icon>
        <h2>No accounts yet</h2>
        <p>Add your first bank account to start tracking your finances.</p>
        <button mat-flat-button color="primary" class="add-first-btn" (click)="openCreateDialog()">
          Add Your First Account
        </button>
      </div>
    } @else {
      <div class="accounts-grid" @staggerFadeIn>
        @for (account of dashboardState.accounts(); track account.id) {
          <div class="account-card glass-card neon-border">
            <div class="card-header">
              <div class="card-icon">
                <mat-icon>account_balance</mat-icon>
              </div>
              <button mat-icon-button
                      class="delete-btn"
                      (click)="deleteAccount(account.id!)"
                      [attr.aria-label]="'Delete account ' + account.name">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>

            <div class="editable-field name-field">
              <label class="sr-only" [attr.for]="'acct-name-' + account.id">Account name</label>
              <input [id]="'acct-name-' + account.id"
                     class="inline-input name-input"
                     type="text"
                     [value]="account.name"
                     (blur)="onNameBlur($event, account)"
                     (keydown.enter)="blurTarget($event)"
                     aria-label="Account name" />
            </div>

            <div class="editable-field balance-field">
              <label class="sr-only" [attr.for]="'acct-balance-' + account.id">Current balance</label>
              <span class="currency-prefix">$</span>
              <input [id]="'acct-balance-' + account.id"
                     class="inline-input balance-input"
                     type="number"
                     step="0.01"
                     min="0"
                     [value]="account.currentBalance"
                     (blur)="onBalanceBlur($event, account)"
                     (keydown.enter)="blurTarget($event)"
                     aria-label="Current balance" />
            </div>

            @if (account.createdAt) {
              <span class="card-date">Added {{ account.createdAt | date: 'mediumDate' }}</span>
            }

            @if (savingId() === account.id) {
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
            aria-label="Add new bank account">
      <mat-icon>add</mat-icon>
    </button>

    @if (deletingId()) {
      <div class="confirm-overlay" (click)="cancelDelete()" @slideInUp role="dialog" aria-label="Confirm deletion">
        <div class="confirm-card glass-card" (click)="$event.stopPropagation()">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
          <h3>Delete Account?</h3>
          <p>This action cannot be undone. All associated data will be lost.</p>
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

    .total-balance {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 1rem 1.5rem;
      min-width: 180px;
    }

    .total-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .total-value {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.25rem;
    }

    .account-card {
      padding: 1.5rem;
      position: relative;
      transition: transform var(--transition-fast), box-shadow var(--transition-base);

      &:hover {
        transform: translateY(-2px);
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: rgba(34, 211, 238, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: var(--accent-primary);
      }
    }

    .delete-btn {
      color: var(--text-muted);
      opacity: 0;
      transition: opacity var(--transition-fast), color var(--transition-fast);

      .account-card:hover & {
        opacity: 1;
      }

      &:hover {
        color: var(--danger);
      }
    }

    /* Inline editable fields */
    .editable-field {
      display: flex;
      align-items: center;
    }

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

    .inline-input {
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      outline: none;
      width: 100%;
      padding: 0.25rem 0.5rem;
      transition: border-color var(--transition-fast), background var(--transition-fast);

      &:hover {
        border-color: rgba(34, 211, 238, 0.2);
      }

      &:focus {
        border-color: var(--accent-primary, #22d3ee);
        background: rgba(34, 211, 238, 0.06);
      }
    }

    .name-input {
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-bottom: 0.25rem;
    }

    .balance-field {
      margin-bottom: 0.5rem;
    }

    .currency-prefix {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-primary);
      margin-right: 0.1rem;
      flex-shrink: 0;
    }

    .balance-input {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-primary);
      letter-spacing: -0.02em;

      /* Hide number spinner */
      -moz-appearance: textfield;
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }

    .card-date {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .save-indicator {
      position: absolute;
      top: 0.75rem;
      right: 3rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
        animation: spin 0.8s linear infinite;
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
  `,
})
export class Accounts implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly bankAccountApi = inject(BankAccountControllerService);

  protected readonly deletingId = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);

  ngOnInit(): void {
    // Data is loaded by the layout, but refresh if empty
    if (this.dashboardState.accounts().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.refresh();
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateAccountDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dashboardState.addAccount(result);
      }
    });
  }

  /** Auto-save name on blur */
  onNameBlur(event: Event, account: BankAccountDTO): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (!newName) {
      // Revert empty names
      input.value = account.name;
      return;
    }
    if (newName === account.name) return;

    const updated: BankAccountDTO = { ...account, name: newName };
    this.saveAccount(account, updated, input);
  }

  /** Auto-save balance on blur */
  onBalanceBlur(event: Event, account: BankAccountDTO): void {
    const input = event.target as HTMLInputElement;
    const newBalance = parseFloat(input.value);
    if (isNaN(newBalance) || newBalance < 0) {
      // Revert invalid values
      input.value = String(account.currentBalance);
      return;
    }
    if (newBalance === account.currentBalance) return;

    const updated: BankAccountDTO = { ...account, currentBalance: newBalance };
    this.saveAccount(account, updated, input);
  }

  /** Blur the input on Enter key */
  blurTarget(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  deleteAccount(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    this.bankAccountApi.deleteBankAccount(id).subscribe({
      next: () => {
        this.dashboardState.removeAccount(id);
        this.dashboardState.removeTransactionsForAccount(id);
        this.deletingId.set(null);
      },
      error: () => {
        this.deletingId.set(null);
      },
    });
  }

  private saveAccount(original: BankAccountDTO, updated: BankAccountDTO, input: HTMLInputElement): void {
    const id = original.id!;
    this.savingId.set(id);

    // Optimistic update — immediately propagates to totalBankBalance, unallocatedAmount, etc.
    this.dashboardState.updateAccount(id, updated);

    this.bankAccountApi.updateBankAccount(id, updated).subscribe({
      next: (saved) => {
        // Reconcile with server response
        this.dashboardState.updateAccount(id, saved);
        this.savingId.set(null);
      },
      error: () => {
        // Revert on failure
        this.dashboardState.updateAccount(id, original);
        if (input.type === 'number') {
          input.value = String(original.currentBalance);
        } else {
          input.value = original.name;
        }
        this.savingId.set(null);
      },
    });
  }
}
