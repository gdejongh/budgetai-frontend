import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';

import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { BankAccountDTO } from '../../../core/api/model/bankAccountDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

export interface CCPaymentDialogData {
  creditCard: BankAccountDTO;
}

@Component({
  selector: 'app-cc-payment-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CurrencyPipe,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">payments</mat-icon>
        <span class="gradient-text">Credit Card Payment</span>
      </h2>

      <mat-dialog-content>
        <div class="cc-summary">
          <span class="cc-name">{{ data.creditCard.name }}</span>
          <span class="cc-balance">{{ data.creditCard.currentBalance | currency }}</span>
          <span class="cc-label">balance owed</span>
        </div>

        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" id="cc-payment-form">
          <mat-form-field appearance="fill">
            <mat-label>Pay From</mat-label>
            <mat-select formControlName="bankAccountId">
              @for (account of bankAccounts(); track account.id) {
                <mat-option [value]="account.id">
                  {{ account.name }} ({{ account.currentBalance | currency }})
                </mat-option>
              }
            </mat-select>
            @if (form.controls.bankAccountId.hasError('required') && form.controls.bankAccountId.touched) {
              <mat-error>Select a bank account to pay from</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Payment Amount</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="amount"
                   placeholder="0.00" step="0.01" min="0.01"
                   (focus)="onAmountFocus()"
                   (blur)="onAmountBlur()" />
            @if (form.controls.amount.hasError('required') && form.controls.amount.touched) {
              <mat-error>Amount is required</mat-error>
            }
            @if (form.controls.amount.hasError('min')) {
              <mat-error>Amount must be greater than zero</mat-error>
            }
            <mat-hint>
              <button type="button" class="pay-full-btn" (click)="payFullBalance()"
                      [disabled]="!data.creditCard.currentBalance">
                Pay full balance ({{ data.creditCard.currentBalance | currency }})
              </button>
            </mat-hint>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Description (optional)</mat-label>
            <input matInput formControlName="description"
                   placeholder="e.g. Monthly CC payment" autocomplete="off" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="transactionDate" />
            @if (form.controls.transactionDate.hasError('required') && form.controls.transactionDate.touched) {
              <mat-error>Date is required</mat-error>
            }
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                type="submit" form="cc-payment-form"
                class="submit-btn"
                [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>payments</mat-icon>
              Make Payment
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container {
      min-width: 400px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.5rem;
    }

    .title-icon {
      color: #fb923c;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .cc-summary {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: rgba(251, 146, 60, 0.06);
      border: 1px solid rgba(251, 146, 60, 0.15);
    }

    .cc-name {
      font-weight: 600;
      font-size: 0.95rem;
      margin-bottom: 0.25rem;
    }

    .cc-balance {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fb923c;
    }

    .cc-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    mat-dialog-content {
      padding-top: 0.5rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
      color: var(--danger);
      font-size: 0.875rem;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
    }

    .pay-full-btn {
      background: none;
      border: none;
      color: var(--accent-primary);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0;
      font-family: inherit;

      &:hover:not(:disabled) {
        text-decoration: underline;
      }

      &:disabled {
        color: var(--text-muted);
        cursor: default;
      }
    }

    .submit-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.1) 50%,
          transparent 100%
        );
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }

      &:hover:not(:disabled)::after {
        transform: translateX(100%);
      }

      mat-spinner {
        display: inline-block;
      }
    }
  `,
})
export class CCPaymentDialog {
  private readonly dialogRef = inject(MatDialogRef<CCPaymentDialog>);
  private readonly transactionApi = inject(TransactionControllerService);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly fb = inject(FormBuilder);
  readonly data: CCPaymentDialogData = inject(MAT_DIALOG_DATA);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly bankAccounts = this.dashboardState.bankAccounts;

  protected readonly form = this.fb.nonNullable.group({
    bankAccountId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
    transactionDate: [this.todayStr(), Validators.required],
  });

  payFullBalance(): void {
    this.form.controls.amount.setValue(this.data.creditCard.currentBalance ?? 0);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.transactionApi.createCCPayment({
      bankAccountId: this.form.value.bankAccountId!,
      creditCardId: this.data.creditCard.id!,
      amount: this.form.value.amount!,
      description: this.form.value.description || undefined,
      transactionDate: this.form.value.transactionDate!,
    }).subscribe({
      next: (bankSideTxn) => {
        this.loading.set(false);
        // Refresh all data to get linked transactions and updated balances
        this.dashboardState.refresh();
        this.dialogRef.close(bankSideTxn);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to process payment. Please try again.'
        );
      },
    });
  }

  onAmountFocus(): void {
    const ctrl = this.form.controls.amount;
    if (ctrl.value === 0) {
      ctrl.setValue(null as unknown as number);
    }
  }

  onAmountBlur(): void {
    const ctrl = this.form.controls.amount;
    if (ctrl.value === null) {
      ctrl.setValue(0);
    }
  }

  private todayStr(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
