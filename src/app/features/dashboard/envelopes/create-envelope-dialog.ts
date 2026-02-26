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

import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { EnvelopeDTO } from '../../../core/api/model/envelopeDTO';
import { ConfettiService } from '../../../shared/services/confetti.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-create-envelope-dialog',
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
        <mat-icon class="title-icon">mail</mat-icon>
        <span class="gradient-text">New Envelope</span>
      </h2>

      <mat-dialog-content>
        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" id="create-envelope-form">
          <mat-form-field appearance="fill">
            <mat-label>Envelope Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Groceries"
                   autocomplete="off" />
            @if (form.controls.name.hasError('required') && form.controls.name.touched) {
              <mat-error>Envelope name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Initial Allocation</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" formControlName="allocatedBalance"
                   placeholder="0.00" step="0.01" min="0" />
            @if (form.controls.allocatedBalance.hasError('min')) {
              <mat-error>Allocation cannot be negative</mat-error>
            }
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                type="submit" form="create-envelope-form"
                class="submit-btn"
                [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>add</mat-icon>
              Create Envelope
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
      color: var(--accent-secondary, #818cf8);
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
export class CreateEnvelopeDialog {
  private readonly dialogRef = inject(MatDialogRef<CreateEnvelopeDialog>);
  private readonly envelopeApi = inject(EnvelopeControllerService);
  private readonly confetti = inject(ConfettiService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    allocatedBalance: [0, [Validators.min(0)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const dto: EnvelopeDTO = {
      appUserId: '', // Backend sets this from the auth token
      name: this.form.value.name!,
      allocatedBalance: this.form.value.allocatedBalance ?? 0,
    };

    this.envelopeApi.createEnvelope(dto).subscribe({
      next: (created) => {
        this.loading.set(false);
        this.confetti.celebrate();
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to create envelope. Please try again.'
        );
      },
    });
  }
}
