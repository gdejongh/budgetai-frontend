import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
  ElementRef,
  viewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { EnvelopeDTO } from '../../../core/api/model/envelopeDTO';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { DashboardStateService, SpentTimePeriod } from '../dashboard-state.service';
import { CreateEnvelopeDialog } from './create-envelope-dialog';
import { TransactionPreview } from '../../../shared/components/transaction-preview/transaction-preview';
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
    CurrencyPipe,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    Counter,
    SkeletonCard,
    TransactionPreview,
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
            <span class="total-label">Unallocated</span>
            <span
              class="total-value glow-text"
              [class.unallocated-yellow]="dashboardState.unallocatedAmount() > 0"
              [class.unallocated-red]="dashboardState.unallocatedAmount() < 0"
            >
              <app-counter [targetValue]="dashboardState.unallocatedAmount()" />
            </span>
            @if (dashboardState.unallocatedAmount() < 0) {
              <div class="unallocated-warning-box" role="alert">
                <mat-icon class="warning-icon">warning_amber</mat-icon>
                <span class="unallocated-warning-text">
                  You have allocated more to your envelopes than the total available in your accounts. Please adjust your allocations.
                </span>
              </div>
            }
          </div>
        }
      </div>
    </div>

    @if (dashboardState.loading()) {
      <div class="envelopes-grid">
        <app-skeleton-card [count]="3" height="200px" />
      </div>
    } @else {
    

      @if (dashboardState.envelopes().length === 0) {
        <div class="empty-state glass-card" @scaleBounce>
          <mat-icon>mail</mat-icon>
          <h2>No envelopes yet</h2>
          <p>Create your first envelope to allocate funds and stay within budget.</p>
          <button mat-flat-button color="primary" class="add-first-btn" (click)="openCreateDialog()">
            Create Your First Envelope
          </button>
        </div>
      } @else {
        <div class="time-period-toggle" role="group" aria-label="Spending time period">
          <mat-button-toggle-group
            [value]="dashboardState.spentTimePeriod()"
            (change)="onTimePeriodChange($event.value)"
            aria-label="Select spending time period"
            hideSingleSelectionIndicator>
            <mat-button-toggle value="week">Week</mat-button-toggle>
            <mat-button-toggle value="month">Month</mat-button-toggle>
            <mat-button-toggle value="year">Year</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <div class="envelopes-grid" @staggerFadeIn>
          @for (envelope of dashboardState.envelopes(); track envelope.id) {
            <div
              class="envelope-card glass-card neon-border"
              [class.envelope-negative]="remainingForEnvelope(envelope.id!) < 0"
            >
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

              <div class="envelope-finances">
                  <!-- Remaining: now at top, larger, with progress bar and warning icon -->
                  <div class="finance-row remaining-row" style="margin-bottom: 0.5rem;">
                    <span class="finance-label" style="font-size:1rem;font-weight:700;">Remaining</span>
                    <span class="finance-value remaining-value"
                          [class.remaining-positive]="remainingForEnvelope(envelope.id!) >= 0"
                          [class.remaining-negative]="remainingForEnvelope(envelope.id!) < 0"
                          style="font-size:1.35rem;font-weight:900;display:flex;align-items:center;gap:0.4rem;"
                          aria-live="polite"
                          [attr.aria-label]="'Remaining: ' + (remainingForEnvelope(envelope.id!) | currency:'USD':'symbol':'1.2-2')">
                      {{ remainingForEnvelope(envelope.id!) | currency:'USD':'symbol':'1.2-2' }}
                      @if (remainingForEnvelope(envelope.id!) < 0) {
                        <mat-icon class="remaining-warning" aria-label="Overspent">warning_amber</mat-icon>
                      }
                    </span>
                  </div>
                  <!-- Progress bar for remaining/allocated -->
                  <div class="remaining-progress-bar" role="progressbar"
                       [attr.aria-valuenow]="percentRemaining(envelope)"
                       aria-valuemin="0" aria-valuemax="100"
                       [attr.aria-label]="'Remaining funds: ' + percentRemaining(envelope) + '%'">
                    <div class="progress-track">
                      <div class="progress-fill"
                           [style.width]="percentRemaining(envelope) + '%'"
                           [class.negative]="remainingForEnvelope(envelope.id!) < 0"
                           [class.low]="remainingForEnvelope(envelope.id!) <= envelope.allocatedBalance * 0.1"
                      ></div>
                    </div>
                  </div>
                  <div class="finance-row allocated-row">
                      <span class="finance-label">Allocated</span>
                      <div class="editable-field balance-field">
                        <label class="sr-only" [attr.for]="'balance-' + envelope.id">Allocated balance</label>
                        <span class="currency-prefix">$</span>
                        <div class="allocated-input-wrapper">
                          <input [id]="'balance-' + envelope.id"
                                 class="inline-input balance-input editable-highlight"
                                 type="number"
                                 step="0.01"
                                 min="0"
                                 [value]="envelope.allocatedBalance"
                                 (blur)="onBalanceBlur($event, envelope)"
                                 (keydown.enter)="blurTarget($event)"
                                 aria-label="Allocated balance"
                                 title="Edit allocated amount" />
                          <mat-icon class="edit-icon" aria-hidden="true" title="Edit">edit</mat-icon>
                        </div>
                      </div>
                  </div>
                  <div class="finance-row spent-row">
                    <span class="finance-label">Spent</span>
                    <span class="finance-value spent-value">{{ spentForEnvelope(envelope.id!) | currency:'USD':'symbol':'1.2-2' }}</span>
                  </div>
              </div>

              @if (envelope.createdAt) {
                <span class="card-date">Created {{ envelope.createdAt | date: 'mediumDate' }}</span>
              }

              @if (savingId() === envelope.id) {
                <div class="save-indicator" @fadeIn>
                  <mat-icon>sync</mat-icon>
                </div>
              }

              <button class="view-txn-link"
                      cdkOverlayOrigin
                      #iconOrigin="cdkOverlayOrigin"
                      (click)="togglePreview(envelope.id!)"
                      [attr.aria-label]="'View transactions for ' + envelope.name">
                <mat-icon>receipt_long</mat-icon>
                <span>{{ txnCountForEnvelope(envelope.id!) }} transactions</span>
                <mat-icon class="link-arrow">chevron_right</mat-icon>
              </button>
            </div>

            <ng-template cdkConnectedOverlay
                         [cdkConnectedOverlayOrigin]="iconOrigin"
                         [cdkConnectedOverlayOpen]="activePreviewId() === envelope.id"
                         [cdkConnectedOverlayHasBackdrop]="true"
                         cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
                         (backdropClick)="closePreview()"
                         (detach)="closePreview()"
                         [cdkConnectedOverlayPositions]="previewPositions">
              <app-transaction-preview
                [transactions]="previewTransactions()"
                [entityName]="previewEntityName()"
                [totalCount]="previewTotalCount()"
                (selectTransaction)="onPreviewSelectTransaction($event)"
                (viewAll)="onPreviewViewAll()" />
            </ng-template>
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
        .allocated-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .editable-highlight {
          background: rgba(129,140,248,0.08);
          border: 1px solid var(--accent-secondary, #818cf8);
          transition: background 0.2s, border-color 0.2s;
        }
        .editable-highlight:focus {
          background: rgba(129,140,248,0.16);
          border-color: var(--accent-secondary, #818cf8);
        }
        .edit-icon {
          font-size: 1rem;
          margin-left: 0.3rem;
          color: var(--accent-secondary, #818cf8);
          opacity: 0.7;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .allocated-input-wrapper:hover .edit-icon,
        .allocated-input-wrapper:focus-within .edit-icon {
          opacity: 1;
        }
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

    .unallocated-yellow {
      color: var(--warning, #fbbf24);
      text-shadow: 0 0 8px rgba(251, 191, 36, 0.25);
    }

    .unallocated-red {
      color: var(--danger, #ef4444);
      text-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
    }

    .unallocated-warning-box {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin-top: 0.75rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid var(--danger, #ef4444);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      box-shadow: 0 2px 12px 0 rgba(239, 68, 68, 0.08);
      color: var(--danger, #ef4444);
      font-size: 1rem;
      font-weight: 500;
      text-align: left;
      max-width: 420px;
      margin-left: auto;
    }

    .unallocated-warning-box .warning-icon {
      color: var(--danger, #ef4444);
      font-size: 1.5rem;
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
    }

    .unallocated-warning-text {
      flex: 1;
      line-height: 1.4;
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
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 320px;
    }

    .envelope-negative {
      border-color: var(--danger, #ef4444) !important;
      box-shadow: 0 0 0 2px var(--danger, #ef4444), 0 2px 12px 0 rgba(239, 68, 68, 0.08);
      background: rgba(239, 68, 68, 0.06);
      color: var(--danger, #ef4444);
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
      margin-bottom: 0;
      margin-left: auto;
    }

    .currency-prefix {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-right: 0.1rem;
      flex-shrink: 0;
    }

    .balance-input {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      width: auto;
      max-width: 5rem;
      text-align: right;
      padding: 0.15rem 0.35rem;

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

    .time-period-toggle {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1.25rem;
    }

    .envelope-finances {
      display: grid;
      grid-template-rows: repeat(3, auto);
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      margin-top: 0.5rem;
      padding: 0.5rem 0 0.25rem 0;
    }

    .finance-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      padding: 0.15rem 0;
    }

    .finance-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-right: 0.5rem;
    }

    .finance-value {
      font-size: 1.05rem;
      font-weight: 700;
      text-align: right;
      min-width: 80px;
      letter-spacing: -0.01em;
    }

    .spent-value {
      color: var(--text-secondary);
      opacity: 0.85;
    }

    .remaining-positive {
        color: var(--success, #22c55e);
        text-shadow: 0 0 8px rgba(34, 197, 94, 0.22);
        font-weight: 900;
    }

    .remaining-negative {
        color: var(--danger, #ef4444);
        text-shadow: 0 0 10px rgba(239, 68, 68, 0.22);
        font-weight: 900;
      }

      .remaining-warning {
        color: var(--danger, #ef4444);
        font-size: 1.2rem;
        vertical-align: middle;
        margin-left: 0.2rem;
      }

      .remaining-progress-bar {
        width: 100%;
        height: 8px;
        margin: 0.2rem 0 0.7rem 0;
        background: transparent;
        border-radius: 6px;
        position: relative;
        box-sizing: border-box;
      }
      .progress-track {
        width: 100%;
        height: 100%;
        background: var(--border-subtle, #e5e7eb);
        border-radius: 6px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: var(--success, #22c55e);
        border-radius: 6px;
        transition: width 0.3s cubic-bezier(.4,0,.2,1);
      }
      .progress-fill.low {
        background: var(--warning, #fbbf24);
      }
      .progress-fill.negative {
        background: var(--danger, #ef4444);
      }

    .view-txn-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.5rem;
      margin-top: 0.75rem;
      border: 1px solid transparent;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      background: transparent;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      border-radius: 0 0 var(--radius-sm, 8px) var(--radius-sm, 8px);
      transition: color var(--transition-fast), background var(--transition-fast);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .link-arrow {
        margin-left: auto;
        opacity: 0;
        transition: opacity var(--transition-fast), transform var(--transition-fast);
      }

      &:hover {
        color: var(--accent-secondary, #818cf8);
        background: rgba(129, 140, 248, 0.04);

        .link-arrow {
          opacity: 1;
          transform: translateX(2px);
        }
      }

      &:focus-visible {
        outline: 2px solid var(--accent-secondary, #818cf8);
        outline-offset: -2px;
      }
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
  private readonly router = inject(Router);

  protected readonly deletingId = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);
  protected readonly bannerDismissed = signal(false);
  protected readonly activePreviewId = signal<string | null>(null);

  protected readonly previewPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  ];

    /** Returns percent remaining for progress bar (0-100, clamps negative/overflow) */
    percentRemaining(envelope: EnvelopeDTO): number {
      const allocated = envelope.allocatedBalance || 1;
      const remaining = this.remainingForEnvelope(envelope.id!);
      return Math.max(0, Math.min(100, Math.round((remaining / allocated) * 100)));
    }

  protected readonly previewTransactions = computed(() => {
    const id = this.activePreviewId();
    if (!id) return [];
    return this.dashboardState.transactions()
      .filter(t => t.envelopeId === id)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .slice(0, 5);
  });

  protected readonly previewTotalCount = computed(() => {
    const id = this.activePreviewId();
    if (!id) return 0;
    return this.dashboardState.transactions().filter(t => t.envelopeId === id).length;
  });

  protected readonly previewEntityName = computed(() => {
    const id = this.activePreviewId();
    if (!id) return '';
    return this.dashboardState.envelopes().find(e => e.id === id)?.name ?? '';
  });

  protected readonly txnCountMap = computed(() => {
    const map: Record<string, number> = {};
    for (const t of this.dashboardState.transactions()) {
      if (t.envelopeId) {
        map[t.envelopeId] = (map[t.envelopeId] ?? 0) + 1;
      }
    }
    return map;
  });

  /** Maps envelopeId → spent amount for the selected time period (positive value) */
  protected readonly spentMap = computed(() => {
    const map: Record<string, number> = {};
    for (const s of this.dashboardState.spentSummaries()) {
      map[s.envelopeId] = Math.abs(s.periodSpent);
    }
    return map;
  });

  /** Maps envelopeId → remaining (allocated + all-time spent, where spent is negative) */
  protected readonly remainingMap = computed(() => {
    const envelopes = this.dashboardState.envelopes();
    const summaries = this.dashboardState.spentSummaries();
    const totalSpentMap: Record<string, number> = {};
    for (const s of summaries) {
      totalSpentMap[s.envelopeId] = s.totalSpent;
    }
    const map: Record<string, number> = {};
    for (const e of envelopes) {
      if (e.id) {
        map[e.id] = (e.allocatedBalance ?? 0) + (totalSpentMap[e.id] ?? 0);
      }
    }
    return map;
  });

  spentForEnvelope(envelopeId: string): number {
    return this.spentMap()[envelopeId] ?? 0;
  }

  remainingForEnvelope(envelopeId: string): number {
    return this.remainingMap()[envelopeId] ?? 0;
  }

  txnCountForEnvelope(envelopeId: string): number {
    return this.txnCountMap()[envelopeId] ?? 0;
  }

  ngOnInit(): void {
    if (this.dashboardState.envelopes().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.refresh();
    }
  }

  onTimePeriodChange(value: SpentTimePeriod): void {
    this.dashboardState.spentTimePeriod.set(value);
    this.dashboardState.loadSpentSummaries();
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

  togglePreview(id: string): void {
    this.activePreviewId.update(current => current === id ? null : id);
  }

  closePreview(): void {
    this.activePreviewId.set(null);
  }

  onPreviewSelectTransaction(txn: TransactionDTO): void {
    const envelopeId = this.activePreviewId();
    this.closePreview();
    this.router.navigate(['/dashboard/transactions'], {
      queryParams: { envelopeId, highlightId: txn.id },
    });
  }

  onPreviewViewAll(): void {
    const id = this.activePreviewId();
    this.closePreview();
    this.router.navigate(['/dashboard/transactions'], {
      queryParams: { envelopeId: id },
    });
  }
}
