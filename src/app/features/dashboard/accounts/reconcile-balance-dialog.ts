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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';

import { BankAccountControllerService } from '../../../core/api/api/bankAccountController.service';
import { BankAccountDTO } from '../../../core/api/model/bankAccountDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

export interface ReconcileBalanceDialogData {
  account: BankAccountDTO;
}

@Component({
  selector: 'app-reconcile-balance-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CurrencyPipe,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">tune</mat-icon>
        <span class="gradient-text">Adjust Balance</span>
      </h2>

      <mat-dialog-content>
        <div class="account-summary">
          <span class="account-name">{{ data.account.name }}</span>
          <span class="account-balance">{{ data.account.currentBalance | currency }}</span>
          <span class="account-label">current balance</span>
        </div>

        <p class="reconcile-hint">
          Enter the correct balance from your statement. An adjustment transaction
          will be created for the difference.
        </p>

        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" id="reconcile-form">
          <mat-form-field appearance="fill">
            <mat-label>Correct Balance</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="targetBalance"
                   placeholder="0.00" step="0.01" min="0"
                   (focus)="onBalanceFocus()"
                   (blur)="onBalanceBlur()" />
            @if (form.controls.targetBalance.hasError('required') && form.controls.targetBalance.touched) {
              <mat-error>Balance is required</mat-error>
            }
            @if (form.controls.targetBalance.hasError('min')) {
              <mat-error>Balance cannot be negative</mat-error>
            }
          </mat-form-field>

          @if (adjustmentAmount() !== 0) {
            <div class="adjustment-preview" [class.increase]="adjustmentAmount() > 0"
                 [class.decrease]="adjustmentAmount() < 0" @slideInUp>
              <mat-icon>{{ adjustmentAmount() > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
              <span>
                {{ adjustmentAmount() > 0 ? '+' : '' }}{{ adjustmentAmount() | currency }}
                adjustment
              </span>
            </div>
          }
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                type="submit" form="reconcile-form"
                class="submit-btn"
                [disabled]="loading() || form.invalid || adjustmentAmount() === 0">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>check</mat-icon>
              Adjust Balance
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

    .account-summary {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: rgba(251, 146, 60, 0.06);
      border: 1px solid rgba(251, 146, 60, 0.15);
    }

    .account-name {
      font-weight: 600;
      font-size: 0.95rem;
      margin-bottom: 0.25rem;
    }

    .account-balance {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fb923c;
    }

    .account-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .reconcile-hint {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
      line-height: 1.5;
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

    .adjustment-preview {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-weight: 600;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.increase {
        background: rgba(251, 146, 60, 0.08);
        border: 1px solid rgba(251, 146, 60, 0.2);
        color: #fb923c;
      }

      &.decrease {
        background: rgba(74, 222, 128, 0.08);
        border: 1px solid rgba(74, 222, 128, 0.2);
        color: #4ade80;
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
export class ReconcileBalanceDialog {
  private readonly dialogRef = inject(MatDialogRef<ReconcileBalanceDialog>);
  private readonly bankAccountApi = inject(BankAccountControllerService);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly fb = inject(FormBuilder);
  readonly data: ReconcileBalanceDialogData = inject(MAT_DIALOG_DATA);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    targetBalance: [this.data.account.currentBalance ?? 0, [Validators.required, Validators.min(0)]],
  });

  protected readonly adjustmentAmount = computed(() => {
    const target = this.form.controls.targetBalance.value;
    const current = this.data.account.currentBalance ?? 0;
    if (target === null || target === undefined || isNaN(target)) return 0;
    return Math.round((target - current) * 100) / 100;
  });

  onSubmit(): void {
    if (this.form.invalid || this.adjustmentAmount() === 0) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const targetBalance = this.form.value.targetBalance!;

    this.bankAccountApi.reconcileBankAccount(this.data.account.id!, { targetBalance }).subscribe({
      next: (updated) => {
        this.loading.set(false);
        this.dashboardState.updateAccount(updated.id!, updated);
        this.dashboardState.loadTransactions();
        this.dialogRef.close(updated);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to adjust balance. Please try again.'
        );
      },
    });
  }

  onBalanceFocus(): void {
    const ctrl = this.form.controls.targetBalance;
    if (ctrl.value === 0) {
      ctrl.setValue(null as unknown as number);
    }
  }

  onBalanceBlur(): void {
    const ctrl = this.form.controls.targetBalance;
    if (ctrl.value === null) {
      ctrl.setValue(0);
    }
  }
}
