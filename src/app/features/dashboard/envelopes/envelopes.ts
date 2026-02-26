import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  ElementRef,
  viewChildren,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { EnvelopeDTO } from '../../../core/api/model/envelopeDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateEnvelopeDialog } from './create-envelope-dialog';
import { Counter } from '../../../shared/components/counter/counter';
import { SkeletonCard } from '../../../shared/components/skeleton-card/skeleton-card';
import { UnallocatedBanner } from '../../../shared/components/unallocated-banner/unallocated-banner';
import {
  staggerFadeIn,
  slideInUp,
  scaleBounce,
  fadeIn,
} from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-envelopes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    Counter,
    SkeletonCard,
    UnallocatedBanner,
  ],
  animations: [staggerFadeIn, slideInUp, scaleBounce, fadeIn],
  template: `
    <div class="page-header" @slideInUp>
      <div class="header-row">
        <div>
          <h1>Envelopes</h1>
          <p>Organize your budget with envelope categories</p>
        </div>
        @if (!dashboardState.loading() && dashboardState.envelopes().length > 0) {
          <div class="total-allocation glass-card glow-card">
            <span class="total-label">Total Allocated</span>
            <span class="total-value glow-text">
              <app-counter [targetValue]="dashboardState.totalEnvelopeAllocation()" />
            </span>
          </div>
        }
      </div>
    </div>

    @if (dashboardState.loading()) {
      <div class="envelopes-grid">
        <app-skeleton-card [count]="3" height="200px" />
      </div>
    } @else {
      @if (dashboardState.unallocatedAmount() !== 0 && !bannerDismissed()) {
        <app-unallocated-banner
          [amount]="dashboardState.unallocatedAmount()"
          (dismiss)="bannerDismissed.set(true)"
          @fadeIn />
      }

      @if (dashboardState.envelopes().length === 0) {
        <div class="empty-state glass-card" @scaleBounce>
          <mat-icon>mail</mat-icon>
          <h2>No envelopes yet</h2>
          <p>Create your first envelope to allocate funds and stay within budget.</p>
          <button mat-flat-button color="primary" class="add-first-btn" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Create Your First Envelope
          </button>
        </div>
      } @else {
        <div class="envelopes-grid" @staggerFadeIn>
          @for (envelope of dashboardState.envelopes(); track envelope.id) {
            <div class="envelope-card glass-card neon-border">
              <div class="card-header">
                <div class="card-icon">
                  <mat-icon>mail</mat-icon>
                </div>
                <button mat-icon-button
                        class="delete-btn"
                        (click)="deleteEnvelope(envelope.id!)"
                        [attr.aria-label]="'Delete envelope ' + envelope.name">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>

              <div class="editable-field name-field">
                <label class="sr-only" [attr.for]="'name-' + envelope.id">Envelope name</label>
                <input [id]="'name-' + envelope.id"
                       class="inline-input name-input"
                       type="text"
                       [value]="envelope.name"
                       (blur)="onNameBlur($event, envelope)"
                       (keydown.enter)="blurTarget($event)"
                       aria-label="Envelope name" />
              </div>

              <div class="editable-field balance-field">
                <label class="sr-only" [attr.for]="'balance-' + envelope.id">Allocated balance</label>
                <span class="currency-prefix">$</span>
                <input [id]="'balance-' + envelope.id"
                       class="inline-input balance-input"
                       type="number"
                       step="0.01"
                       min="0"
                       [value]="envelope.allocatedBalance"
                       (blur)="onBalanceBlur($event, envelope)"
                       (keydown.enter)="blurTarget($event)"
                       aria-label="Allocated balance" />
              </div>

              @if (envelope.createdAt) {
                <span class="card-date">Created {{ envelope.createdAt | date: 'mediumDate' }}</span>
              }

              @if (savingId() === envelope.id) {
                <div class="save-indicator" @fadeIn>
                  <mat-icon>sync</mat-icon>
                </div>
              }
            </div>
          }
        </div>
      }
    }

    <button mat-fab
            color="primary"
            class="fab-add"
            (click)="openCreateDialog()"
            aria-label="Create new envelope">
      <mat-icon>add</mat-icon>
    </button>

    @if (deletingId()) {
      <div class="confirm-overlay"
           (click)="cancelDelete()"
           (keydown.escape)="cancelDelete()"
           @slideInUp
           role="dialog"
           aria-label="Confirm deletion">
        <div class="confirm-card glass-card" (click)="$event.stopPropagation()">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
          <h3>Delete Envelope?</h3>
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

    .total-allocation {
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

    .envelopes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.25rem;
    }

    .envelope-card {
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
      background: rgba(129, 140, 248, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: var(--accent-secondary, #818cf8);
      }
    }

    .delete-btn {
      color: var(--text-muted);
      opacity: 0;
      transition: opacity var(--transition-fast), color var(--transition-fast);

      .envelope-card:hover & {
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
        border-color: rgba(129, 140, 248, 0.2);
      }

      &:focus {
        border-color: var(--accent-secondary, #818cf8);
        background: rgba(129, 140, 248, 0.06);
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
      color: var(--accent-secondary, #818cf8);
      margin-right: 0.1rem;
      flex-shrink: 0;
    }

    .balance-input {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-secondary, #818cf8);
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
        color: var(--accent-secondary, #818cf8);
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
        color: var(--accent-secondary, #818cf8);
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
        0 4px 20px rgba(129, 140, 248, 0.3),
        0 0 40px rgba(129, 140, 248, 0.15);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        transform: scale(1.1);
        box-shadow:
          0 6px 30px rgba(129, 140, 248, 0.4),
          0 0 60px rgba(129, 140, 248, 0.2);
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
export class Envelopes implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly envelopeApi = inject(EnvelopeControllerService);

  protected readonly deletingId = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);
  protected readonly bannerDismissed = signal(false);

  ngOnInit(): void {
    if (this.dashboardState.envelopes().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.refresh();
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateEnvelopeDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dashboardState.addEnvelope(result);
      }
    });
  }

  /** Auto-save name on blur */
  onNameBlur(event: Event, envelope: EnvelopeDTO): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (!newName || newName === envelope.name) return;

    const updated: EnvelopeDTO = { ...envelope, name: newName };
    this.saveEnvelope(envelope, updated, input);
  }

  /** Auto-save balance on blur */
  onBalanceBlur(event: Event, envelope: EnvelopeDTO): void {
    const input = event.target as HTMLInputElement;
    const newBalance = parseFloat(input.value);
    if (isNaN(newBalance) || newBalance < 0 || newBalance === envelope.allocatedBalance) {
      // Revert invalid values
      input.value = String(envelope.allocatedBalance);
      return;
    }

    const updated: EnvelopeDTO = { ...envelope, allocatedBalance: newBalance };
    this.saveEnvelope(envelope, updated, input);
  }

  /** Blur the input on Enter key */
  blurTarget(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  deleteEnvelope(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    // Optimistic delete
    const envelope = this.dashboardState.envelopes().find(e => e.id === id);
    this.dashboardState.removeEnvelope(id);
    this.deletingId.set(null);

    this.envelopeApi.deleteEnvelope(id).subscribe({
      error: () => {
        // Revert on failure
        if (envelope) {
          this.dashboardState.addEnvelope(envelope);
        }
      },
    });
  }

  private saveEnvelope(original: EnvelopeDTO, updated: EnvelopeDTO, input: HTMLInputElement): void {
    const id = original.id!;
    this.savingId.set(id);

    // Optimistic update
    this.dashboardState.updateEnvelope(id, updated);

    this.envelopeApi.updateEnvelope(id, updated).subscribe({
      next: (saved) => {
        // Reconcile with server response
        this.dashboardState.updateEnvelope(id, saved);
        this.savingId.set(null);
      },
      error: () => {
        // Revert on failure
        this.dashboardState.updateEnvelope(id, original);
        if (input.type === 'number') {
          input.value = String(original.allocatedBalance);
        } else {
          input.value = original.name;
        }
        this.savingId.set(null);
      },
    });
  }
}
