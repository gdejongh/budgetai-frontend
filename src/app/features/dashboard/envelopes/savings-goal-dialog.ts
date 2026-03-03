import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { EnvelopeDTO } from '../../../core/api/model/envelopeDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

export interface SavingsGoalDialogData {
  envelope: EnvelopeDTO;
}

@Component({
  selector: 'app-savings-goal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">savings</mat-icon>
        <span class="gradient-text">{{ isEditing() ? 'Edit Savings Goal' : 'Set Savings Goal' }}</span>
      </h2>

      <mat-dialog-content>
        <p class="dialog-subtitle">
          Choose a goal type for <strong>{{ data.envelope.name }}</strong>
        </p>

        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <mat-button-toggle-group
          [value]="goalType()"
          (change)="goalType.set($event.value)"
          class="goal-type-toggle"
          aria-label="Goal type">
          <mat-button-toggle value="MONTHLY">
            <mat-icon>repeat</mat-icon>
            Monthly
          </mat-button-toggle>
          <mat-button-toggle value="WEEKLY">
            <mat-icon>date_range</mat-icon>
            Weekly
          </mat-button-toggle>
          <mat-button-toggle value="TARGET">
            <mat-icon>flag</mat-icon>
            Target Amount
          </mat-button-toggle>
        </mat-button-toggle-group>

        @if (goalType() === 'MONTHLY') {
          <div class="goal-type-description" @slideInUp>
            <mat-icon>info_outline</mat-icon>
            <span>Save a fixed amount each month, ongoing.</span>
          </div>

          <form [formGroup]="monthlyForm" (ngSubmit)="onSubmit()" id="savings-goal-form">
            <mat-form-field appearance="fill">
              <mat-label>Monthly Savings Target</mat-label>
              <span matTextPrefix>$&nbsp;</span>
              <input matInput type="number" formControlName="monthlyGoalTarget"
                     placeholder="200.00" step="0.01" min="0.01"
                     (focus)="onNumericFocus(monthlyForm.controls.monthlyGoalTarget)"
                     (blur)="onNumericBlur(monthlyForm.controls.monthlyGoalTarget)" />
              @if (monthlyForm.controls.monthlyGoalTarget.hasError('required') && monthlyForm.controls.monthlyGoalTarget.touched) {
                <mat-error>Monthly target is required</mat-error>
              }
              @if (monthlyForm.controls.monthlyGoalTarget.hasError('min')) {
                <mat-error>Must be greater than $0</mat-error>
              }
              <mat-hint>How much you want to save each month</mat-hint>
            </mat-form-field>
          </form>
        }

        @if (goalType() === 'WEEKLY') {
          <div class="goal-type-description" @slideInUp>
            <mat-icon>info_outline</mat-icon>
            <span>Save a fixed amount each week, ongoing.</span>
          </div>

          <form [formGroup]="weeklyForm" (ngSubmit)="onSubmit()" id="savings-goal-form">
            <mat-form-field appearance="fill">
              <mat-label>Weekly Savings Target</mat-label>
              <span matTextPrefix>$&nbsp;</span>
              <input matInput type="number" formControlName="weeklyGoalTarget"
                     placeholder="50.00" step="0.01" min="0.01"
                     (focus)="onNumericFocus(weeklyForm.controls.weeklyGoalTarget)"
                     (blur)="onNumericBlur(weeklyForm.controls.weeklyGoalTarget)" />
              @if (weeklyForm.controls.weeklyGoalTarget.hasError('required') && weeklyForm.controls.weeklyGoalTarget.touched) {
                <mat-error>Weekly target is required</mat-error>
              }
              @if (weeklyForm.controls.weeklyGoalTarget.hasError('min')) {
                <mat-error>Must be greater than $0</mat-error>
              }
              <mat-hint>How much you want to save each week</mat-hint>
            </mat-form-field>
          </form>
        }

        @if (goalType() === 'TARGET') {
          <div class="goal-type-description" @slideInUp>
            <mat-icon>info_outline</mat-icon>
            <span>Save a total amount by a target date. The app calculates your monthly contribution.</span>
          </div>

          <form [formGroup]="targetForm" (ngSubmit)="onSubmit()" id="savings-goal-form">
            <mat-form-field appearance="fill">
              <mat-label>Total Goal Amount</mat-label>
              <span matTextPrefix>$&nbsp;</span>
              <input matInput type="number" formControlName="goalAmount"
                     placeholder="1000.00" step="0.01" min="0.01"
                     (focus)="onNumericFocus(targetForm.controls.goalAmount)"
                     (blur)="onNumericBlur(targetForm.controls.goalAmount)" />
              @if (targetForm.controls.goalAmount.hasError('required') && targetForm.controls.goalAmount.touched) {
                <mat-error>Goal amount is required</mat-error>
              }
              @if (targetForm.controls.goalAmount.hasError('min')) {
                <mat-error>Must be greater than $0</mat-error>
              }
              <mat-hint>The total amount you want to save</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Target Date</mat-label>
              <input matInput type="date" formControlName="goalTargetDate"
                     [min]="minTargetDate" />
              @if (targetForm.controls.goalTargetDate.hasError('required') && targetForm.controls.goalTargetDate.touched) {
                <mat-error>Target date is required</mat-error>
              }
              <mat-hint>When you want to reach this goal</mat-hint>
            </mat-form-field>

            @if (computedMonthlyAmount() !== null) {
              <div class="computed-monthly" @slideInUp>
                <mat-icon>calculate</mat-icon>
                <span>
                  You'll need to save
                  <strong>{{ computedMonthlyAmount()! | currency:'USD':'symbol':'1.2-2' }}/mo</strong>
                  over <strong>{{ monthsUntilTarget() }} months</strong>
                </span>
              </div>
            }
          </form>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @if (isEditing()) {
          <button mat-button
                  color="warn"
                  class="remove-btn"
                  [disabled]="loading()"
                  (click)="onRemoveGoal()">
            <mat-icon>delete_outline</mat-icon>
            Remove Goal
          </button>
        }
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                type="submit" form="savings-goal-form"
                class="submit-btn"
                [disabled]="loading() || isFormInvalid()">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>{{ isEditing() ? 'edit' : 'savings' }}</mat-icon>
              {{ isEditing() ? 'Update Goal' : 'Set Goal' }}
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container {
      min-width: 420px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.5rem;
    }

    .title-icon {
      color: var(--accent-secondary, #818cf8);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .dialog-subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    mat-dialog-content {
      padding-top: 0.5rem;
    }

    .goal-type-toggle {
      width: 100%;
      margin-bottom: 1rem;

      mat-button-toggle {
        flex: 1;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 0.35rem;
          vertical-align: middle;
        }
      }
    }

    .goal-type-description {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: rgba(129, 140, 248, 0.06);
      border: 1px solid rgba(129, 140, 248, 0.15);
      color: var(--text-secondary);
      font-size: 0.82rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-secondary, #818cf8);
        flex-shrink: 0;
      }
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

    .computed-monthly {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      margin-top: 0.5rem;
      border-radius: var(--radius-sm);
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.2);
      color: var(--text-secondary);
      font-size: 0.85rem;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--success, #22c55e);
        flex-shrink: 0;
      }

      strong {
        color: var(--success, #22c55e);
      }
    }

    .remove-btn {
      margin-right: auto;
      display: flex;
      align-items: center;
      gap: 0.25rem;
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
export class SavingsGoalDialog {
  private readonly dialogRef = inject(MatDialogRef<SavingsGoalDialog>);
  protected readonly data: SavingsGoalDialogData = inject(MAT_DIALOG_DATA);
  private readonly envelopeApi = inject(EnvelopeControllerService);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly goalType = signal<'MONTHLY' | 'WEEKLY' | 'TARGET'>(
    (this.data.envelope.goalType as 'MONTHLY' | 'WEEKLY' | 'TARGET') ?? 'MONTHLY'
  );

  protected readonly isEditing = computed(() =>
    this.data.envelope.goalType != null
  );

  // Form for MONTHLY goal type
  protected readonly monthlyForm = this.fb.nonNullable.group({
    monthlyGoalTarget: [
      this.data.envelope.goalType === 'MONTHLY' ? (this.data.envelope.monthlyGoalTarget ?? 0) : 0,
      [Validators.required, Validators.min(0.01)],
    ],
  });

  // Form for WEEKLY goal type (stores target in monthlyGoalTarget on the backend)
  protected readonly weeklyForm = this.fb.nonNullable.group({
    weeklyGoalTarget: [
      this.data.envelope.goalType === 'WEEKLY' ? (this.data.envelope.monthlyGoalTarget ?? 0) : 0,
      [Validators.required, Validators.min(0.01)],
    ],
  });

  // Form for TARGET goal type
  protected readonly targetForm = this.fb.nonNullable.group({
    goalAmount: [
      this.data.envelope.goalType === 'TARGET' ? (this.data.envelope.goalAmount ?? 0) : 0,
      [Validators.required, Validators.min(0.01)],
    ],
    goalTargetDate: [
      this.data.envelope.goalType === 'TARGET' ? (this.data.envelope.goalTargetDate ?? '') : '',
      [Validators.required],
    ],
  });

  protected readonly minTargetDate = (() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return now.toISOString().split('T')[0];
  })();

  /** Number of months between now and the target date */
  protected readonly monthsUntilTarget = computed(() => {
    const dateStr = this.targetForm.value.goalTargetDate;
    if (!dateStr) return 0;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const months = (target.getFullYear() - now.getFullYear()) * 12
      + (target.getMonth() - now.getMonth());
    return Math.max(1, months);
  });

  /** Computed monthly contribution for TARGET goal */
  protected readonly computedMonthlyAmount = computed(() => {
    const goal = this.targetForm.value.goalAmount;
    const months = this.monthsUntilTarget();
    if (!goal || goal <= 0 || months <= 0) return null;
    return Math.ceil((goal / months) * 100) / 100;
  });

  isFormInvalid(): boolean {
    switch (this.goalType()) {
      case 'MONTHLY': return this.monthlyForm.invalid;
      case 'WEEKLY':  return this.weeklyForm.invalid;
      case 'TARGET':  return this.targetForm.invalid;
    }
  }

  onSubmit(): void {
    if (this.isFormInvalid()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const envelope = this.data.envelope;
    let updated: EnvelopeDTO;

    switch (this.goalType()) {
      case 'MONTHLY':
        updated = {
          ...envelope,
          goalType: 'MONTHLY',
          monthlyGoalTarget: this.monthlyForm.value.monthlyGoalTarget!,
          goalAmount: undefined,
          goalTargetDate: undefined,
        };
        break;
      case 'WEEKLY':
        updated = {
          ...envelope,
          goalType: 'WEEKLY',
          monthlyGoalTarget: this.weeklyForm.value.weeklyGoalTarget!,
          goalAmount: undefined,
          goalTargetDate: undefined,
        };
        break;
      case 'TARGET':
        updated = {
          ...envelope,
          goalType: 'TARGET',
          goalAmount: this.targetForm.value.goalAmount!,
          goalTargetDate: this.targetForm.value.goalTargetDate!,
          monthlyGoalTarget: undefined,
        };
        break;
    }

    this.envelopeApi.updateEnvelope(envelope.id!, updated).subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.dashboardState.updateEnvelope(envelope.id!, saved);
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to save goal. Please try again.'
        );
      },
    });
  }

  onRemoveGoal(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const envelope = this.data.envelope;
    const updated: EnvelopeDTO = {
      ...envelope,
      goalType: undefined,
      goalAmount: undefined,
      monthlyGoalTarget: undefined,
      goalTargetDate: undefined,
    };

    this.envelopeApi.updateEnvelope(envelope.id!, updated).subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.dashboardState.updateEnvelope(envelope.id!, saved);
        this.dialogRef.close(saved);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to remove goal. Please try again.'
        );
      },
    });
  }

  onNumericFocus(ctrl: { value: number; setValue: (v: number) => void }): void {
    if (ctrl.value === 0) {
      ctrl.setValue(null as unknown as number);
    }
  }

  onNumericBlur(ctrl: { value: number; setValue: (v: number) => void }): void {
    if (ctrl.value === null) {
      ctrl.setValue(0);
    }
  }
}
