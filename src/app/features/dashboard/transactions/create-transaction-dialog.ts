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
        <mat-icon class="title-icon">receipt_long</mat-icon>
        <span class="gradient-text">New Transaction</span>
      </h2>

      <mat-dialog-content>
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
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="amount"
                   placeholder="0.00" step="0.01" />
            @if (form.controls.amount.hasError('required') && form.controls.amount.touched) {
              <mat-error>Amount is required</mat-error>
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
              <mat-icon>add</mat-icon>
              Add Transaction
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container { min-width: 380px; }
    .dialog-title { display: flex; align-items: center; gap: 0.75rem; padding-bottom: 0.5rem; }
    .title-icon { color: var(--accent-primary); font-size: 28px; width: 28px; height: 28px; }
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

  protected readonly form = this.fb.nonNullable.group({
    bankAccountId: ['', Validators.required],
    amount: [0, Validators.required],
    description: [''],
    transactionDate: [new Date(), Validators.required],
    envelopeId: [''],
  });

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

    const dto: TransactionDTO = {
      bankAccountId: raw.bankAccountId,
      amount: raw.amount,
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
