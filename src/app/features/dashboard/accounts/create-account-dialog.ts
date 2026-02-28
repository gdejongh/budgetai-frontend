import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { BankAccountControllerService } from '../../../core/api/api/bankAccountController.service';
import { CreateBankAccountRequest } from '../../../core/api/model/createBankAccountRequest';
import { ConfettiService } from '../../../shared/services/confetti.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-create-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">account_balance</mat-icon>
        <span class="gradient-text">New Bank Account</span>
      </h2>

      <mat-dialog-content>
        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" id="create-account-form">
          <mat-form-field appearance="fill">
            <mat-label>Account Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Checking Account"
                   autocomplete="off" />
            @if (form.controls.name.hasError('required') && form.controls.name.touched) {
              <mat-error>Account name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Current Balance</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="currentBalance"
                   placeholder="0.00" step="0.01" min="0"
                   (focus)="onCurrentBalanceFocus()"
                   (blur)="onCurrentBalanceBlur()" />
            @if (form.controls.currentBalance.hasError('required') && form.controls.currentBalance.touched) {
              <mat-error>Balance is required</mat-error>
            }
            @if (form.controls.currentBalance.hasError('min')) {
              <mat-error>Balance cannot be negative</mat-error>
            }
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                type="submit" form="create-account-form"
                class="submit-btn"
                [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>add</mat-icon>
              Create Account
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
      color: var(--accent-primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
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
export class CreateAccountDialog {
  private readonly dialogRef = inject(MatDialogRef<CreateAccountDialog>);
  private readonly bankAccountApi = inject(BankAccountControllerService);
  private readonly confetti = inject(ConfettiService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    currentBalance: [0, [Validators.required, Validators.min(0)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const dto: CreateBankAccountRequest = {
      name: this.form.value.name!,
      currentBalance: this.form.value.currentBalance!,
    };

    this.bankAccountApi.createBankAccount(dto).subscribe({
      next: (created) => {
        this.loading.set(false);
        this.confetti.celebrate();
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to create account. Please try again.'
        );
      },
    });
  }

  onCurrentBalanceFocus(): void {
    const ctrl = this.form.controls.currentBalance;
    if (ctrl.value === 0) {
      ctrl.setValue(null as unknown as number); // Clear the field visually
    }
  }

  onCurrentBalanceBlur(): void {
    const ctrl = this.form.controls.currentBalance;
    // If left empty (null), reset to 0
    if (ctrl.value === null) {
      ctrl.setValue(0);
    }
  }
}
