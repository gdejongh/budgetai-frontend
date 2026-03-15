import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';
import { DashboardStateService } from '../dashboard-state.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-delete-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">warning_amber</mat-icon>
        <span>Delete account</span>
      </h2>

      <mat-dialog-content>
        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <div class="warning-card">
          <p>
            This will permanently delete your BudgetAI account and all associated budgeting data.
          </p>
          <ul>
            <li>Bank accounts and balances</li>
            <li>Envelope categories and envelopes</li>
            <li>Transactions and allocation history</li>
          </ul>
          <p class="warning-emphasis">This action cannot be undone.</p>
        </div>

        <p class="account-email">
          Signed in as <strong>{{ userEmail() || 'your account' }}</strong>
        </p>

        <form [formGroup]="form" (ngSubmit)="confirmDelete()" id="delete-account-form">
          <mat-form-field appearance="fill">
            <mat-label>Type DELETE to confirm</mat-label>
            <input
              matInput
              formControlName="confirmationText"
              autocomplete="off"
              spellcheck="false" />
            @if (form.controls.confirmationText.touched && !isConfirmationTextValid()) {
              <mat-error>Enter DELETE exactly to continue</mat-error>
            }
          </mat-form-field>

          <mat-checkbox formControlName="understandsConsequences" class="confirm-checkbox">
            I understand my account and all associated data will be permanently removed.
          </mat-checkbox>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button
          mat-flat-button
          color="warn"
          type="submit"
          form="delete-account-form"
          class="delete-btn"
          [disabled]="loading() || !canDelete()">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>delete_forever</mat-icon>
              Delete account
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container {
      min-width: 420px;
      max-width: 100%;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.5rem;
    }

    .title-icon {
      color: var(--danger, #f87171);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 0.5rem;
    }

    .warning-card {
      padding: 1rem;
      border-radius: var(--radius-md);
      background: rgba(248, 113, 113, 0.08);
      border: 1px solid rgba(248, 113, 113, 0.2);

      p,
      ul {
        margin: 0;
      }

      ul {
        padding-left: 1.25rem;
        margin: 0.75rem 0;
        color: var(--text-secondary);
      }
    }

    .warning-emphasis {
      color: var(--danger, #f87171);
      font-weight: 600;
    }

    .account-email {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .confirm-checkbox {
      margin-top: -0.25rem;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
      color: var(--danger, #f87171);
      font-size: 0.875rem;
    }

    .delete-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 154px;
      justify-content: center;
    }

    @media (max-width: 640px) {
      .dialog-container {
        min-width: 0;
      }
    }
  `,
})
export class DeleteAccountDialog {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<DeleteAccountDialog>);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly userEmail = this.authService.userEmail;
  protected readonly form = this.fb.nonNullable.group({
    confirmationText: ['', Validators.required],
    understandsConsequences: [false, Validators.requiredTrue],
  });

  protected isConfirmationTextValid(): boolean {
    return this.form.controls.confirmationText.value.trim() === 'DELETE';
  }

  protected canDelete(): boolean {
    return this.isConfirmationTextValid() && this.form.controls.understandsConsequences.valid;
  }

  confirmDelete(): void {
    if (!this.canDelete() || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.deleteCurrentUser().pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        this.dashboardState.reset();
        this.authService.clearSession();
        this.dialogRef.close(true);
        void this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
      },
    });
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const maybeError = error as {
        error?: { message?: string };
        message?: string;
      };
      return maybeError.error?.message ?? maybeError.message ?? 'Unable to delete your account right now.';
    }

    return 'Unable to delete your account right now.';
  }
}
