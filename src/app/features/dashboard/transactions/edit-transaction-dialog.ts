import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';

import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

export interface EditTransactionDialogData {
  transaction: TransactionDTO;
}

export interface EditTransactionDialogResult {
  original: TransactionDTO;
  saved: TransactionDTO;
}

@Component({
  selector: 'app-edit-transaction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon" [class.deposit-icon]="transactionType() === 'deposit'"
                                      [class.withdrawal-icon]="transactionType() === 'withdrawal'">
          {{ transactionType() === 'deposit' ? 'attach_money' : 'money_off' }}
        </mat-icon>
        <span [class.deposit-text]="transactionType() === 'deposit'"
              [class.withdrawal-text]="transactionType() === 'withdrawal'">
          {{ dialogTitle() }}
        </span>
      </h2>

      <mat-dialog-content>
        <!-- Deposit / Withdrawal toggle -->
        <div class="type-toggle" role="radiogroup" aria-label="Transaction type">
          <button type="button"
                  class="toggle-btn deposit"
                  [class.active]="transactionType() === 'deposit'"
                  role="radio"
                  [attr.aria-checked]="transactionType() === 'deposit'"
                  [attr.aria-label]="isCreditCard() ? 'Refund' : 'Deposit'"
                  (click)="transactionType.set('deposit')">
            <mat-icon>arrow_downward</mat-icon>
            {{ isCreditCard() ? 'Refund' : 'Deposit' }}
          </button>
          <button type="button"
                  class="toggle-btn withdrawal"
                  [class.active]="transactionType() === 'withdrawal'"
                  role="radio"
                  [attr.aria-checked]="transactionType() === 'withdrawal'"
                  [attr.aria-label]="isCreditCard() ? 'Purchase' : 'Withdrawal'"
                  (click)="transactionType.set('withdrawal')">
            <mat-icon>arrow_upward</mat-icon>
            {{ isCreditCard() ? 'Purchase' : 'Withdrawal' }}
          </button>
        </div>

        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" id="edit-transaction-form">
          <mat-form-field appearance="fill">
            <mat-label>Account</mat-label>
            <mat-select formControlName="bankAccountId">
              @for (account of dashboardState.accounts(); track account.id) {
                <mat-option [value]="account.id">
                  @switch (account.accountType) {
                    @case ('CREDIT_CARD') {
                      <mat-icon class="option-icon cc-option">credit_card</mat-icon>
                    }
                    @case ('SAVINGS') {
                      <mat-icon class="option-icon savings-option">savings</mat-icon>
                    }
                    @default {
                      <mat-icon class="option-icon">account_balance</mat-icon>
                    }
                  }
                  {{ account.name }}
                </mat-option>
              }
            </mat-select>
            @if (form.controls.bankAccountId.hasError('required') && form.controls.bankAccountId.touched) {
              <mat-error>Account is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Amount</mat-label>
            <span matTextPrefix [class.deposit-prefix]="transactionType() === 'deposit'"
                                [class.withdrawal-prefix]="transactionType() === 'withdrawal'">
              {{ transactionType() === 'deposit' ? '+$' : '-$' }}&nbsp;
            </span>
            <input matInput type="number" formControlName="amount"
                   placeholder="0.00" step="0.01" min="0"
                   (focus)="onAmountFocus()"
                   (blur)="onAmountBlur()" />
            @if (form.controls.amount.hasError('required') && form.controls.amount.touched) {
              <mat-error>Amount is required</mat-error>
            }
            @if (form.controls.amount.hasError('min') && form.controls.amount.touched) {
              <mat-error>Amount must be greater than zero</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description"
                   placeholder="e.g. Grocery shopping" autocomplete="off" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="transactionDate" />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
            @if (form.controls.transactionDate.hasError('required') && form.controls.transactionDate.touched) {
              <mat-error>Date is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Envelope (optional)</mat-label>
            <mat-select formControlName="envelopeId">
              <mat-option value="">None</mat-option>
              @for (envelope of dashboardState.envelopes(); track envelope.id) {
                <mat-option [value]="envelope.id">{{ envelope.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                type="submit" form="edit-transaction-form"
                class="submit-btn"
                [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>save</mat-icon>
              Save Changes
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container {
      min-width: 380px;

      @media (max-width: 480px) {
        min-width: unset;
        width: 100%;
      }
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.5rem;
    }

    .title-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      transition: color 300ms ease;
    }

    .deposit-icon { color: var(--success); }
    .withdrawal-icon { color: var(--danger); }

    .deposit-text {
      background: linear-gradient(135deg, #34d399, #6ee7b7);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }

    .withdrawal-text {
      background: linear-gradient(135deg, #f87171, #fca5a5);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }

    .type-toggle {
      display: flex;
      gap: 0;
      background: rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-lg);
      padding: 4px;
      margin-bottom: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .toggle-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      border: none;
      border-radius: calc(var(--radius-lg) - 4px);
      background: transparent;
      color: var(--text-muted, rgba(255, 255, 255, 0.45));
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
      }

      &.deposit.active {
        background: rgba(52, 211, 153, 0.15);
        color: var(--success);
        box-shadow: 0 0 20px rgba(52, 211, 153, 0.15);
      }

      &.withdrawal.active {
        background: rgba(248, 113, 113, 0.15);
        color: var(--danger);
        box-shadow: 0 0 20px rgba(248, 113, 113, 0.15);
      }

      &:not(.active):hover {
        background: rgba(255, 255, 255, 0.06);
        color: var(--text-secondary, rgba(255, 255, 255, 0.65));
      }
    }

    .deposit-prefix {
      color: var(--success);
      font-weight: 600;
    }

    .withdrawal-prefix {
      color: var(--danger);
      font-weight: 600;
    }

    mat-dialog-content { padding-top: 0.5rem; }
    form { display: flex; flex-direction: column; gap: 0.25rem; }

    .option-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 8px;
      vertical-align: middle;
      color: var(--text-muted);

      &.cc-option { color: #fb923c; }
      &.savings-option { color: #4ade80; }
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
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
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
export class EditTransactionDialog {
  private readonly dialogRef = inject(MatDialogRef<EditTransactionDialog>);
  private readonly data: EditTransactionDialogData = inject(MAT_DIALOG_DATA);
  private readonly transactionApi = inject(TransactionControllerService);
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly fb = inject(FormBuilder);

  private readonly original = this.data.transaction;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly transactionType = signal<'deposit' | 'withdrawal'>(
    this.original.amount >= 0 ? 'deposit' : 'withdrawal'
  );

  protected readonly selectedAccountId = signal(this.original.bankAccountId);

  protected readonly isCreditCard = computed(() => {
    const id = this.selectedAccountId();
    if (!id) return false;
    return this.dashboardState.isCreditCard(id);
  });

  protected readonly dialogTitle = computed(() => {
    if (this.isCreditCard()) {
      return this.transactionType() === 'deposit' ? 'Edit Refund' : 'Edit Purchase';
    }
    return this.transactionType() === 'deposit' ? 'Edit Deposit' : 'Edit Withdrawal';
  });

  private readonly glowEffect = effect(() => {
    const type = this.transactionType();
    if (type === 'deposit') {
      this.dialogRef.removePanelClass('withdrawal-glow-dialog');
      this.dialogRef.addPanelClass('deposit-glow-dialog');
    } else {
      this.dialogRef.removePanelClass('deposit-glow-dialog');
      this.dialogRef.addPanelClass('withdrawal-glow-dialog');
    }
  });

  protected readonly form = this.fb.nonNullable.group({
    bankAccountId: [this.original.bankAccountId, Validators.required],
    amount: [Math.abs(this.original.amount), [Validators.required, Validators.min(0.01)]],
    description: [this.original.description ?? ''],
    transactionDate: [this.parseDate(this.original.transactionDate), Validators.required],
    envelopeId: [this.original.envelopeId ?? ''],
  });

  constructor() {
    this.form.controls.bankAccountId.valueChanges.subscribe(id => {
      this.selectedAccountId.set(id);
    });
  }

  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();

    const date = raw.transactionDate;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const signedAmount = this.transactionType() === 'withdrawal'
      ? -Math.abs(raw.amount)
      : Math.abs(raw.amount);

    const dto: TransactionDTO = {
      ...this.original,
      bankAccountId: raw.bankAccountId,
      amount: signedAmount,
      description: raw.description || undefined,
      transactionDate: `${year}-${month}-${day}`,
      envelopeId: raw.envelopeId || undefined,
    };

    this.transactionApi.updateTransaction(this.original.id!, dto).subscribe({
      next: (saved) => {
        this.loading.set(false);
        const result: EditTransactionDialogResult = {
          original: this.original,
          saved,
        };
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to update transaction. Please try again.'
        );
      },
    });
  }
}
