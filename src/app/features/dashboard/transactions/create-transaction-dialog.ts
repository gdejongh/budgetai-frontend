import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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

@Component({
  selector: 'app-create-transaction-dialog',
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
                  aria-label="Deposit"
                  (click)="transactionType.set('deposit')">
            <mat-icon>arrow_downward</mat-icon>
            Deposit
          </button>
          <button type="button"
                  class="toggle-btn withdrawal"
                  [class.active]="transactionType() === 'withdrawal'"
                  role="radio"
                  [attr.aria-checked]="transactionType() === 'withdrawal'"
                  aria-label="Withdrawal"
                  (click)="transactionType.set('withdrawal')">
            <mat-icon>arrow_upward</mat-icon>
            Withdrawal
          </button>
        </div>

        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" id="create-transaction-form">
          <mat-form-field appearance="fill">
            <mat-label>Bank Account</mat-label>
            <mat-select formControlName="bankAccountId">
              @for (account of dashboardState.accounts(); track account.id) {
                <mat-option [value]="account.id">{{ account.name }}</mat-option>
              }
            </mat-select>
            @if (form.controls.bankAccountId.hasError('required') && form.controls.bankAccountId.touched) {
              <mat-error>Bank account is required</mat-error>
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
                       (blur)="onAmountBlur()"
                     />
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
                type="submit" form="create-transaction-form"
                class="submit-btn"
                [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>{{ transactionType() === 'deposit' ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
              {{ transactionType() === 'deposit' ? 'Add Deposit' : 'Add Withdrawal' }}
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container {
      min-width: 380px;
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

    /* Segmented toggle */
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
    .error-banner { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem;
      margin-bottom: 1rem; border-radius: var(--radius-sm);
      background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3);
      color: var(--danger); font-size: 0.875rem;
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; } }
    .submit-btn { display: flex; align-items: center; gap: 0.5rem; position: relative; overflow: hidden;
      &::after { content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
        transform: translateX(-100%); transition: transform 0.6s ease; }
      &:hover:not(:disabled)::after { transform: translateX(100%); }
      mat-spinner { display: inline-block; } }
  `,
})
export class CreateTransactionDialog {
  private readonly dialogRef = inject(MatDialogRef<CreateTransactionDialog>);
  private readonly transactionApi = inject(TransactionControllerService);
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly transactionType = signal<'deposit' | 'withdrawal'>('withdrawal');

  protected readonly dialogTitle = computed(() =>
    this.transactionType() === 'deposit' ? 'New Deposit' : 'New Withdrawal'
  );

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
    bankAccountId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
    transactionDate: [new Date(), Validators.required],
    envelopeId: [''],
  });

  onAmountFocus(): void {
    const ctrl = this.form.controls.amount;
    if (ctrl.value === 0) {
      ctrl.setValue(null as unknown as number); // Clear the field visually
    }
  }

  onAmountBlur(): void {
    const ctrl = this.form.controls.amount;
    // If left empty (null), reset to 0
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

    // Format date as YYYY-MM-DD for the backend LocalDate
    const date = raw.transactionDate;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const signedAmount = this.transactionType() === 'withdrawal'
      ? -Math.abs(raw.amount)
      : Math.abs(raw.amount);

    const dto: TransactionDTO = {
      bankAccountId: raw.bankAccountId,
      amount: signedAmount,
      description: raw.description || undefined,
      transactionDate: `${year}-${month}-${day}`,
      envelopeId: raw.envelopeId || undefined,
    };

    this.transactionApi.create1(dto).subscribe({
      next: (created) => {
        this.loading.set(false);
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to create transaction. Please try again.'
        );
      },
    });
  }
}
