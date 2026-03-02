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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { EnvelopeCategoryControllerService } from '../../../core/api/api/envelopeCategoryController.service';
import { EnvelopeDTO } from '../../../core/api/model/envelopeDTO';
import { EnvelopeCategoryDTO } from '../../../core/api/model/envelopeCategoryDTO';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateEnvelopeDialog, CreateEnvelopeDialogData } from './create-envelope-dialog';
import { CreateCategoryDialog } from './create-category-dialog';
import { SavingsGoalDialog, SavingsGoalDialogData } from './savings-goal-dialog';
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
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
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
    

      @if (dashboardState.envelopeCategories().length === 0) {
        <div class="empty-state glass-card" @scaleBounce>
          <mat-icon>category</mat-icon>
          <h2>No categories yet</h2>
          <p>Create your first category to organize your envelopes.</p>
          <button mat-flat-button color="primary" class="add-first-btn" (click)="openCreateCategoryDialog()">
            Create Your First Category
          </button>
        </div>
      } @else {
        <div class="month-navigator" role="navigation" aria-label="Month navigation">
          <button mat-icon-button (click)="navigateMonth(-1)" aria-label="Previous month">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <span class="month-label">{{ viewedMonthLabel() }}</span>
          <button mat-icon-button (click)="navigateMonth(1)" aria-label="Next month">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>

        <div class="categories-list" @staggerFadeIn>
          @for (category of dashboardState.sortedEnvelopeCategories(); track category.id) {
            <section class="category-section glass-card neon-border">
              <div class="category-header" (click)="toggleCategory(category.id!)">
                <button class="collapse-toggle" mat-icon-button
                        [attr.aria-expanded]="!isCategoryCollapsed(category.id!)"
                        [attr.aria-label]="'Toggle ' + category.name">
                  <mat-icon>{{ isCategoryCollapsed(category.id!) ? 'expand_more' : 'expand_less' }}</mat-icon>
                </button>
                <div class="category-name-area">
                  <div class="editable-field category-name-field" (click)="$event.stopPropagation()">
                    <label class="sr-only" [attr.for]="'cat-name-' + category.id">Category name</label>
                    <input [id]="'cat-name-' + category.id"
                           class="inline-input category-name-input"
                           type="text"
                           maxlength="100"
                           [value]="category.name"
                           [readOnly]="category.categoryType === 'CC_PAYMENT'"
                           (blur)="onCategoryNameBlur($event, category)"
                           (keydown.enter)="blurTarget($event)"
                           aria-label="Category name" />
                  </div>
                </div>
                @if (category.categoryType === 'CC_PAYMENT') {
                  <div class="category-summary">
                    <span class="cat-stat">
                      <span class="cat-stat-label">Total Debt</span>
                      <span class="cat-stat-value">{{ ccCategoryTotalDebt(category.id!) | currency:'USD':'symbol':'1.2-2' }}</span>
                    </span>
                    <span class="cat-stat">
                      <span class="cat-stat-label">Funded</span>
                      <span class="cat-stat-value">{{ ccCategoryTotalFunded(category.id!) | currency:'USD':'symbol':'1.2-2' }}</span>
                    </span>
                    <span class="cat-stat">
                      @if (ccCategoryTotalFunded(category.id!) >= ccCategoryTotalDebt(category.id!)) {
                        <span class="cat-stat-label">Status</span>
                        <span class="cat-stat-value cc-funded">Fully Funded</span>
                      } @else {
                        <span class="cat-stat-label">Underfunded</span>
                        <span class="cat-stat-value remaining-negative">{{ ccCategoryTotalDebt(category.id!) - ccCategoryTotalFunded(category.id!) | currency:'USD':'symbol':'1.2-2' }}</span>
                      }
                    </span>
                  </div>
                } @else {
                  <div class="category-summary">
                    <span class="cat-stat">
                      <span class="cat-stat-label">Allocated</span>
                      <span class="cat-stat-value">{{ categoryMonthlyAllocated(category.id!) | currency:'USD':'symbol':'1.2-2' }}</span>
                    </span>
                    <span class="cat-stat">
                      <span class="cat-stat-label">Spent</span>
                      <span class="cat-stat-value spent-value">{{ categorySpent(category.id!) | currency:'USD':'symbol':'1.2-2' }}</span>
                    </span>
                    <span class="cat-stat">
                      <span class="cat-stat-label">Remaining</span>
                      <span class="cat-stat-value"
                            [class.remaining-positive]="categoryRemaining(category.id!) >= 0"
                            [class.remaining-negative]="categoryRemaining(category.id!) < 0">
                        {{ categoryRemaining(category.id!) | currency:'USD':'symbol':'1.2-2' }}
                      </span>
                    </span>
                  </div>
                }
                <div class="category-actions" (click)="$event.stopPropagation()">
                  @if (category.categoryType !== 'CC_PAYMENT') {
                    <button mat-icon-button
                            (click)="openCreateEnvelopeDialog(category.id!)"
                            [attr.aria-label]="'Add envelope to ' + category.name">
                      <mat-icon>add</mat-icon>
                    </button>
                    <button mat-icon-button
                            class="delete-btn"
                            (click)="deleteCategory(category.id!)"
                            [attr.aria-label]="'Delete category ' + category.name">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  }
                </div>
              </div>

              @if (!isCategoryCollapsed(category.id!)) {
                @if (envelopesForCategory(category.id!).length === 0) {
                  <div class="category-empty">
                    <p>No envelopes in this category yet.</p>
                    <button mat-stroked-button (click)="openCreateEnvelopeDialog(category.id!)">
                      <mat-icon>add</mat-icon> Add Envelope
                    </button>
                  </div>
                } @else {
                  <div class="envelopes-grid">
                    @for (envelope of envelopesForCategory(category.id!); track envelope.id) {
                      <div
                        class="envelope-card glass-card neon-border"
                        [class.envelope-negative]="isEnvelopeUnhealthy(envelope)"
                        [class.cc-payment-envelope]="envelope.envelopeType === 'CC_PAYMENT'"
                      >
                        <div class="card-header">
                          <div class="card-icon" [class.cc-payment-icon]="envelope.envelopeType === 'CC_PAYMENT'">
                            <mat-icon>{{ envelope.envelopeType === 'CC_PAYMENT' ? 'credit_card' : 'mail' }}</mat-icon>
                          </div>
                          @if (envelope.envelopeType === 'CC_PAYMENT') {
                            <span class="envelope-type-badge cc-payment-badge">CC Payment</span>
                          }
                          @if (isEnvelopeUnhealthy(envelope)) {
                            <span class="envelope-type-badge overspent-badge">{{ envelope.envelopeType === 'CC_PAYMENT' ? 'Underfunded' : 'Overspent' }}</span>
                          }
                          @if (envelope.envelopeType !== 'CC_PAYMENT') {
                            <div class="card-header-actions">
                              <button mat-icon-button
                                      class="goal-btn"
                                      (click)="openSavingsGoalDialog(envelope)"
                                      [attr.aria-label]="envelope.goalType ? 'Edit savings goal for ' + envelope.name : 'Set savings goal for ' + envelope.name">
                                <mat-icon>trending_up</mat-icon>
                              </button>
                              <button mat-icon-button
                                      class="delete-btn"
                                      (click)="deleteEnvelope(envelope.id!)"
                                      [attr.aria-label]="'Delete envelope ' + envelope.name">
                                <mat-icon>delete_outline</mat-icon>
                              </button>
                            </div>
                          }
                        </div>

                        <div class="editable-field name-field">
                          <label class="sr-only" [attr.for]="'name-' + envelope.id">Envelope name</label>
                          <input [id]="'name-' + envelope.id"
                                 class="inline-input name-input"
                                 type="text"
                                 maxlength="100"
                                 [value]="envelope.name"
                                 [readOnly]="envelope.envelopeType === 'CC_PAYMENT'"
                                 (blur)="onNameBlur($event, envelope)"
                                 (keydown.enter)="blurTarget($event)"
                                 aria-label="Envelope name" />
                        </div>

                        @if (envelope.envelopeType === 'CC_PAYMENT') {
                          <div class="envelope-finances">
                            <div class="finance-row" style="margin-bottom: 0.5rem;">
                              <span class="finance-label" style="font-size:1rem;font-weight:700;">Card Balance</span>
                              <span class="finance-value"
                                    style="font-size:1.35rem;font-weight:900;"
                                    aria-live="polite">
                                {{ cardBalanceForEnvelope(envelope) | currency:'USD':'symbol':'1.2-2' }}
                              </span>
                            </div>
                            <div class="remaining-progress-bar" role="progressbar"
                                 [attr.aria-valuenow]="ccCoveragePercent(envelope)"
                                 aria-valuemin="0" aria-valuemax="100"
                                 [attr.aria-label]="'Funding coverage: ' + ccCoveragePercent(envelope) + '%'">
                              <div class="progress-track">
                                <div class="progress-fill"
                                     [style.width]="ccCoveragePercent(envelope) + '%'"
                                     [class.negative]="isEnvelopeUnhealthy(envelope)"
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
                                           [value]="monthlyAllocationForEnvelope(envelope.id!)"
                                           (blur)="onBalanceBlur($event, envelope)"
                                           (keydown.enter)="blurTarget($event)"
                                           aria-label="Allocated balance"
                                           title="Edit allocated amount" />
                                    <mat-icon class="edit-icon" aria-hidden="true" title="Edit">edit</mat-icon>
                                  </div>
                                </div>
                            </div>
                            <div class="finance-row">
                              <span class="finance-label">Available for Payment</span>
                              <span class="finance-value"
                                    [class.remaining-positive]="!isEnvelopeUnhealthy(envelope)"
                                    [class.remaining-negative]="isEnvelopeUnhealthy(envelope)">
                                {{ remainingForEnvelope(envelope.id!) | currency:'USD':'symbol':'1.2-2' }}
                              </span>
                            </div>
                          </div>
                        } @else {
                          <div class="envelope-finances">
                            <div class="finance-row remaining-row" style="margin-bottom: 0.5rem;">
                              <span class="finance-label" style="font-size:1rem;font-weight:700;">Remaining</span>
                              <span class="finance-value remaining-value"
                                    [class.remaining-positive]="!isEnvelopeUnhealthy(envelope)"
                                    [class.remaining-negative]="isEnvelopeUnhealthy(envelope)"
                                    style="font-size:1.35rem;font-weight:900;display:flex;align-items:center;gap:0.4rem;"
                                    aria-live="polite"
                                    [attr.aria-label]="'Remaining: ' + (remainingForEnvelope(envelope.id!) | currency:'USD':'symbol':'1.2-2')">
                                {{ remainingForEnvelope(envelope.id!) | currency:'USD':'symbol':'1.2-2' }}
                                @if (isEnvelopeUnhealthy(envelope)) {
                                  <mat-icon class="remaining-warning" [attr.aria-label]="'Overspent'">warning_amber</mat-icon>
                                }
                              </span>
                            </div>
                            <div class="remaining-progress-bar" role="progressbar"
                                 [attr.aria-valuenow]="percentRemaining(envelope)"
                                 aria-valuemin="0" aria-valuemax="100"
                                 [attr.aria-label]="'Remaining funds: ' + percentRemaining(envelope) + '%'">
                              <div class="progress-track">
                                <div class="progress-fill"
                                     [style.width]="percentRemaining(envelope) + '%'"
                                     [class.negative]="isEnvelopeUnhealthy(envelope)"
                                     [class.low]="!isEnvelopeUnhealthy(envelope) && remainingForEnvelope(envelope.id!) <= envelope.allocatedBalance * 0.1"
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
                                           [value]="monthlyAllocationForEnvelope(envelope.id!)"
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

                          @if (envelope.goalType) {
                            <div class="goal-section" @slideInUp>
                              <div class="goal-header">
                                <mat-icon class="goal-icon">{{ envelope.goalType === 'MONTHLY' ? 'repeat' : 'flag' }}</mat-icon>
                                <span class="goal-label">{{ envelope.goalType === 'MONTHLY' ? 'Monthly Goal' : 'Savings Target' }}</span>
                                <button mat-icon-button
                                        class="goal-edit-btn"
                                        (click)="openSavingsGoalDialog(envelope)"
                                        [attr.aria-label]="'Edit savings goal for ' + envelope.name">
                                  <mat-icon>edit</mat-icon>
                                </button>
                              </div>

                              @if (envelope.goalType === 'MONTHLY') {
                                <!-- Monthly Goal: just the monthly check -->
                                <div class="goal-monthly-check">
                                  <mat-icon [class.met]="isMonthlyGoalMet(envelope)" [class.unmet]="!isMonthlyGoalMet(envelope)">
                                    {{ isMonthlyGoalMet(envelope) ? 'check_circle' : 'radio_button_unchecked' }}
                                  </mat-icon>
                                  <span>
                                    {{ monthlyNetSaved(envelope) | currency:'USD':'symbol':'1.2-2' }}
                                    / {{ envelope.monthlyGoalTarget | currency:'USD':'symbol':'1.2-2' }}
                                    <span class="goal-period">this month</span>
                                  </span>
                                </div>
                              } @else {
                                <!-- Target Goal: progress bar + computed monthly -->
                                <div class="goal-progress-bar" role="progressbar"
                                     [attr.aria-valuenow]="goalProgressPercent(envelope)"
                                     aria-valuemin="0" aria-valuemax="100"
                                     [attr.aria-label]="'Savings goal progress: ' + goalProgressPercent(envelope) + '%'">
                                  <div class="progress-track">
                                    <div class="progress-fill goal-fill"
                                         [style.width]="goalProgressPercent(envelope) + '%'"
                                    ></div>
                                  </div>
                                </div>
                                <div class="goal-stats">
                                  <span class="goal-saved">{{ goalNetSaved(envelope) | currency:'USD':'symbol':'1.2-2' }}</span>
                                  <span class="goal-of">of</span>
                                  <span class="goal-target">{{ envelope.goalAmount | currency:'USD':'symbol':'1.2-2' }}</span>
                                </div>
                                <div class="goal-target-info">
                                  <mat-icon>schedule</mat-icon>
                                  <span>
                                    {{ computedMonthlyForTarget(envelope) | currency:'USD':'symbol':'1.2-2' }}/mo
                                    &middot;
                                    {{ monthsUntilTargetDate(envelope) }} months left
                                  </span>
                                </div>
                              }
                            </div>
                          }
                        }

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
                          <span>{{ txnCountForEnvelope(envelope) }} transactions</span>
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
            </section>
          }
        </div>
      }
    }

    <button mat-fab
            color="primary"
            class="fab-add"
            (click)="openCreateCategoryDialog()"
            aria-label="Create new category">
      <mat-icon>add</mat-icon>
    </button>

    @if (deletingId()) {
      <div class="confirm-overlay"
           (click)="cancelDelete()"
           (keydown.escape)="cancelDelete()"
           @slideInUp
           role="dialog"
           [attr.aria-label]="deletingType() === 'category' ? 'Confirm category deletion' : 'Confirm envelope deletion'">
        <div class="confirm-card glass-card" (click)="$event.stopPropagation()">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
          @if (deletingType() === 'category') {
            <h3>Delete Category?</h3>
            <p>This will delete the category and all envelopes within it. This action cannot be undone.</p>
          } @else {
            <h3>Delete Envelope?</h3>
            <p>This action cannot be undone. All associated data will be lost.</p>
          }
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

    /* ── Category Styles ─────────────────────────────── */

    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .category-section {
      padding: 0;
      overflow: hidden;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast);

      &:hover {
        background: rgba(129, 140, 248, 0.04);
      }
    }

    .collapse-toggle {
      flex-shrink: 0;
    }

    .category-name-area {
      flex: 1;
      min-width: 0;
    }

    .category-name-input {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .category-summary {
      display: flex;
      gap: 1.25rem;
      margin-left: auto;
      flex-shrink: 0;
    }

    .cat-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.1rem;
    }

    .cat-stat-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      font-weight: 500;
    }

    .cat-stat-value {
      font-size: 0.95rem;
      font-weight: 700;
    }

    .category-actions {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
      margin-left: 0.5rem;

      .delete-btn {
        opacity: 1;
      }
    }

    .category-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 1.5rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .category-header {
        flex-wrap: wrap;
        gap: 0.5rem 0.25rem;
      }
      .category-summary {
        width: 100%;
        justify-content: space-around;
        margin-left: 0;
        padding-left: 2.5rem;
      }
      .category-actions {
        margin-left: auto;
      }
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

    .cc-payment-envelope {
      border-color: rgba(251, 146, 60, 0.2) !important;
    }

    .cc-payment-icon {
      background: rgba(251, 146, 60, 0.12) !important;

      mat-icon {
        color: #fb923c !important;
      }
    }

    .envelope-type-badge {
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      white-space: nowrap;

      &.cc-payment-badge {
        background: rgba(251, 146, 60, 0.12);
        color: #fb923c;
      }

      &.overspent-badge {
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
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

      .envelope-card:hover &,
      .category-actions & {
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
      max-width: 7rem;
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

    .month-navigator {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .month-label {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      min-width: 160px;
      text-align: center;
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

    .cc-funded {
      color: var(--success, #22c55e);
      font-weight: 700;
      text-shadow: 0 0 8px rgba(34, 197, 94, 0.22);
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

    /* ── Goal Section Styles ─────────────────────────── */

    .card-header-actions {
      display: flex;
      align-items: center;
      gap: 0;
    }

    .goal-btn {
      color: var(--text-muted);
      opacity: 0;
      transition: opacity var(--transition-fast), color var(--transition-fast);

      .envelope-card:hover & {
        opacity: 1;
      }

      &:hover {
        color: var(--accent-secondary, #818cf8);
      }
    }

    .goal-section {
      margin-top: 0.5rem;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      background: rgba(129, 140, 248, 0.04);
      border: 1px solid rgba(129, 140, 248, 0.12);
    }

    .goal-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.5rem;
    }

    .goal-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--accent-secondary, #818cf8);
    }

    .goal-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent-secondary, #818cf8);
    }

    .goal-edit-btn {
      margin-left: auto;
      width: 28px;
      height: 28px;
      line-height: 28px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--text-muted);
      }

      &:hover mat-icon {
        color: var(--accent-secondary, #818cf8);
      }
    }

    .goal-progress-bar {
      width: 100%;
      height: 6px;
      margin-bottom: 0.5rem;
      background: transparent;
      border-radius: 4px;
    }

    .goal-fill {
      background: linear-gradient(90deg, var(--accent-secondary, #818cf8), #a78bfa);
    }

    .goal-stats {
      display: flex;
      align-items: baseline;
      gap: 0.3rem;
      font-size: 0.85rem;
      margin-bottom: 0.35rem;
    }

    .goal-saved {
      font-weight: 700;
      color: var(--accent-secondary, #818cf8);
    }

    .goal-of {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .goal-target {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .goal-monthly-check {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: var(--text-secondary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      mat-icon.met {
        color: var(--success, #22c55e);
      }

      mat-icon.unmet {
        color: var(--text-muted);
      }
    }

    .goal-period {
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    .goal-target-info {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--accent-secondary, #818cf8);
      }
    }
  `,
})
export class Envelopes implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly envelopeApi = inject(EnvelopeControllerService);
  private readonly categoryApi = inject(EnvelopeCategoryControllerService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly deletingId = signal<string | null>(null);
  protected readonly deletingType = signal<'envelope' | 'category'>('envelope');
  protected readonly savingId = signal<string | null>(null);
  protected readonly bannerDismissed = signal(false);
  protected readonly activePreviewId = signal<string | null>(null);
  protected readonly collapsedCategories = signal(new Set<string>());

  protected readonly previewPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  ];

    /** Returns percent remaining for progress bar (0-100, clamps negative/overflow) */
    percentRemaining(envelope: EnvelopeDTO): number {
      const allocated = this.monthlyAllocationForEnvelope(envelope.id!) || 1;
      const remaining = this.remainingForEnvelope(envelope.id!);
      return Math.max(0, Math.min(100, Math.round((remaining / allocated) * 100)));
    }

  protected readonly previewTransactions = computed(() => {
    const id = this.activePreviewId();
    if (!id) return [];
    const envelope = this.dashboardState.envelopes().find(e => e.id === id);
    const txns = this.dashboardState.transactions();
    const filtered = envelope?.envelopeType === 'CC_PAYMENT' && envelope.linkedAccountId
      ? txns.filter(t => t.bankAccountId === envelope.linkedAccountId)
      : txns.filter(t => t.envelopeId === id);
    return filtered
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .slice(0, 5);
  });

  protected readonly previewTotalCount = computed(() => {
    const id = this.activePreviewId();
    if (!id) return 0;
    const envelope = this.dashboardState.envelopes().find(e => e.id === id);
    const txns = this.dashboardState.transactions();
    return envelope?.envelopeType === 'CC_PAYMENT' && envelope.linkedAccountId
      ? txns.filter(t => t.bankAccountId === envelope.linkedAccountId).length
      : txns.filter(t => t.envelopeId === id).length;
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

  /** Maps linkedAccountId → transaction count for CC Payment envelopes. */
  protected readonly ccTxnCountMap = computed(() => {
    const map: Record<string, number> = {};
    for (const t of this.dashboardState.transactions()) {
      if (t.bankAccountId) {
        map[t.bankAccountId] = (map[t.bankAccountId] ?? 0) + 1;
      }
    }
    return map;
  });

  /** Maps envelopeId → spent amount for the viewed month (positive value) */
  protected readonly spentMap = computed(() => {
    const map: Record<string, number> = {};
    for (const s of this.dashboardState.spentSummaries()) {
      if (s.envelopeId) {
        map[s.envelopeId] = Math.abs(s.periodSpent ?? 0);
      }
    }
    return map;
  });

  /** Maps envelopeId → all-time spent amount (positive value) */
  protected readonly totalSpentMap = computed(() => {
    const map: Record<string, number> = {};
    for (const s of this.dashboardState.spentSummaries()) {
      if (s.envelopeId) {
        map[s.envelopeId] = Math.abs(s.totalSpent ?? 0);
      }
    }
    return map;
  });

  /** Maps envelopeId → monthly allocation amount for the viewed month */
  protected readonly monthlyAllocationMap = computed(() => {
    const map: Record<string, number> = {};
    for (const a of this.dashboardState.monthlyAllocations()) {
      if (a.envelopeId) {
        map[a.envelopeId] = a.amount ?? 0;
      }
    }
    return map;
  });

  /** Maps envelopeId → remaining (cumulative allocations − all-time spent) */
  protected readonly remainingMap = computed(() => {
    const totalSpent = this.totalSpentMap();
    const map: Record<string, number> = {};
    for (const e of this.dashboardState.envelopes()) {
      if (e.id) {
        map[e.id] = (e.allocatedBalance ?? 0) - (totalSpent[e.id] ?? 0);
      }
    }
    return map;
  });

  spentForEnvelope(envelopeId: string): number {
    return this.spentMap()[envelopeId] ?? 0;
  }

  monthlyAllocationForEnvelope(envelopeId: string): number {
    return this.monthlyAllocationMap()[envelopeId] ?? 0;
  }

  remainingForEnvelope(envelopeId: string): number {
    return this.remainingMap()[envelopeId] ?? 0;
  }

  /**
   * For CC Payment envelopes, health is based on whether the allocation
   * covers the linked card's debt (YNAB model), not generic remaining.
   */
  isEnvelopeUnhealthy(envelope: EnvelopeDTO): boolean {
    if (envelope.envelopeType === 'CC_PAYMENT' && envelope.linkedAccountId) {
      const card = this.dashboardState.creditCards().find(c => c.id === envelope.linkedAccountId);
      const debt = card?.currentBalance ?? 0;
      const allocated = envelope.allocatedBalance ?? 0;
      return debt > allocated;
    }
    return this.remainingForEnvelope(envelope.id!) < 0;
  }

  /** Get the linked credit card's current balance (debt) for a CC Payment envelope. */
  cardBalanceForEnvelope(envelope: EnvelopeDTO): number {
    if (!envelope.linkedAccountId) return 0;
    const card = this.dashboardState.creditCards().find(c => c.id === envelope.linkedAccountId);
    return card?.currentBalance ?? 0;
  }

  /** Coverage percent: how much of the card's debt is covered by the all-time allocation. */
  ccCoveragePercent(envelope: EnvelopeDTO): number {
    const debt = this.cardBalanceForEnvelope(envelope);
    if (debt <= 0) return 100;
    const allocated = envelope.allocatedBalance ?? 0;
    return Math.max(0, Math.min(100, Math.round((allocated / debt) * 100)));
  }

  /** Total credit card debt across all CC Payment envelopes in a category. */
  ccCategoryTotalDebt(categoryId: string): number {
    return this.envelopesForCategory(categoryId)
      .reduce((sum, e) => sum + this.cardBalanceForEnvelope(e), 0);
  }

  /** Total funded (all-time allocatedBalance) across all CC Payment envelopes in a category. */
  ccCategoryTotalFunded(categoryId: string): number {
    return this.envelopesForCategory(categoryId)
      .reduce((sum, e) => sum + (e.allocatedBalance ?? 0), 0);
  }

  txnCountForEnvelope(envelope: EnvelopeDTO): number {
    if (envelope.envelopeType === 'CC_PAYMENT' && envelope.linkedAccountId) {
      return this.ccTxnCountMap()[envelope.linkedAccountId] ?? 0;
    }
    return this.txnCountMap()[envelope.id!] ?? 0;
  }

  // ── Savings Goal Helpers ──────────────────────────────────────

  /** Net saved toward a goal = total allocations - total all-time spent */
  goalNetSaved(envelope: EnvelopeDTO): number {
    const totalAllocated = envelope.allocatedBalance ?? 0;
    const totalSpent = this.totalSpentMap()[envelope.id!] ?? 0;
    return Math.max(0, totalAllocated - totalSpent);
  }

  /** Goal progress as a percentage (0-100) */
  goalProgressPercent(envelope: EnvelopeDTO): number {
    const goal = envelope.goalAmount;
    if (!goal || goal <= 0) return 0;
    const saved = this.goalNetSaved(envelope);
    return Math.max(0, Math.min(100, Math.round((saved / goal) * 100)));
  }

  /** Net saved this month = monthly allocation - monthly spent */
  monthlyNetSaved(envelope: EnvelopeDTO): number {
    const allocation = this.monthlyAllocationForEnvelope(envelope.id!);
    const spent = this.spentForEnvelope(envelope.id!);
    return Math.max(0, allocation - spent);
  }

  /** Whether the monthly net saved meets or exceeds the monthly goal target */
  isMonthlyGoalMet(envelope: EnvelopeDTO): boolean {
    if (envelope.goalType === 'TARGET') {
      const monthly = this.computedMonthlyForTarget(envelope);
      return this.monthlyNetSaved(envelope) >= monthly;
    }
    if (!envelope.monthlyGoalTarget || envelope.monthlyGoalTarget <= 0) return false;
    return this.monthlyNetSaved(envelope) >= envelope.monthlyGoalTarget;
  }

  /** Months remaining until the target date for a TARGET goal */
  monthsUntilTargetDate(envelope: EnvelopeDTO): number {
    if (!envelope.goalTargetDate) return 0;
    const target = new Date(envelope.goalTargetDate + 'T00:00:00');
    const now = new Date();
    const months = (target.getFullYear() - now.getFullYear()) * 12
      + (target.getMonth() - now.getMonth());
    return Math.max(1, months);
  }

  /** Computed monthly savings needed for a TARGET goal */
  computedMonthlyForTarget(envelope: EnvelopeDTO): number {
    const goal = envelope.goalAmount;
    const months = this.monthsUntilTargetDate(envelope);
    if (!goal || goal <= 0 || months <= 0) return 0;
    return Math.ceil((goal / months) * 100) / 100;
  }

  ngOnInit(): void {
    if (this.dashboardState.envelopes().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.refresh();
    }
  }

  /** Human-readable label for the currently viewed month */
  protected readonly viewedMonthLabel = computed(() => {
    const str = this.dashboardState.viewedMonth();
    const [year, month] = str.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  /** Navigate to previous or next month */
  navigateMonth(direction: number): void {
    const str = this.dashboardState.viewedMonth();
    const [year, month] = str.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    this.dashboardState.loadMonthData(`${newYear}-${newMonth}-01`);
  }

  // ── Category helpers ──────────────────────────────────────────

  openCreateCategoryDialog(): void {
    const dialogRef = this.dialog.open(CreateCategoryDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dashboardState.addCategory(result);
      }
    });
  }

  openCreateEnvelopeDialog(categoryId: string): void {
    const dialogRef = this.dialog.open(CreateEnvelopeDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
      data: { categoryId } as CreateEnvelopeDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dashboardState.addEnvelope(result);
        if (result.id && result.allocatedBalance) {
          this.dashboardState.updateMonthlyAllocation(result.id, result.allocatedBalance);
        }
      }
    });
  }

  openSavingsGoalDialog(envelope: EnvelopeDTO): void {
    const dialogRef = this.dialog.open(SavingsGoalDialog, {
      width: '460px',
      panelClass: 'dark-dialog',
      data: { envelope } as SavingsGoalDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dashboardState.updateEnvelope(envelope.id!, result);
      }
    });
  }

  toggleCategory(id: string): void {
    this.collapsedCategories.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isCategoryCollapsed(id: string): boolean {
    return this.collapsedCategories().has(id);
  }

  envelopesForCategory(categoryId: string): EnvelopeDTO[] {
    return this.dashboardState.envelopesByCategory().get(categoryId) ?? [];
  }

  categoryAllocated(categoryId: string): number {
    return this.envelopesForCategory(categoryId)
      .reduce((sum, e) => sum + (e.allocatedBalance ?? 0), 0);
  }

  categoryMonthlyAllocated(categoryId: string): number {
    return this.envelopesForCategory(categoryId)
      .reduce((sum, e) => sum + this.monthlyAllocationForEnvelope(e.id!), 0);
  }

  categorySpent(categoryId: string): number {
    return this.envelopesForCategory(categoryId)
      .reduce((sum, e) => sum + this.spentForEnvelope(e.id!), 0);
  }

  categoryRemaining(categoryId: string): number {
    return this.envelopesForCategory(categoryId)
      .reduce((sum, e) => sum + this.remainingForEnvelope(e.id!), 0);
  }

  onCategoryNameBlur(event: Event, category: EnvelopeCategoryDTO): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (!newName || newName === category.name) return;

    const updated: EnvelopeCategoryDTO = { ...category, name: newName };
    this.savingId.set(category.id!);
    this.dashboardState.updateCategory(category.id!, updated);

    this.categoryApi.updateEnvelopeCategory(category.id!, updated).subscribe({
      next: (saved) => {
        this.dashboardState.updateCategory(category.id!, saved);
        this.savingId.set(null);
      },
      error: (err) => {
        this.dashboardState.updateCategory(category.id!, category);
        input.value = category.name;
        this.savingId.set(null);
        this.showError(err, 'Failed to update category name');
      },
    });
  }

  deleteCategory(id: string): void {
    this.deletingId.set(id);
    this.deletingType.set('category');
  }

  // ── Envelope helpers ──────────────────────────────────────────

  /** Auto-save name on blur */
  onNameBlur(event: Event, envelope: EnvelopeDTO): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (!newName || newName === envelope.name) return;

    const updated: EnvelopeDTO = { ...envelope, name: newName };
    this.saveEnvelope(envelope, updated, input);
  }

  /** Auto-save monthly allocation on blur */
  onBalanceBlur(event: Event, envelope: EnvelopeDTO): void {
    const input = event.target as HTMLInputElement;
    const newBalance = parseFloat(input.value);
    const currentAllocation = this.monthlyAllocationForEnvelope(envelope.id!);
    if (isNaN(newBalance) || newBalance === currentAllocation) {
      input.value = String(currentAllocation);
      return;
    }

    if (newBalance < 0) {
      input.value = String(currentAllocation);
      this.showError(null, 'Allocation amount cannot be negative');
      return;
    }

    const id = envelope.id!;
    const month = this.dashboardState.viewedMonth();
    this.savingId.set(id);

    // Optimistic update
    const previousAllocation = currentAllocation;
    this.dashboardState.updateMonthlyAllocation(id, newBalance);

    this.envelopeApi.setAllocation(id, month, { amount: newBalance }).subscribe({
      next: () => {
        // Reload only envelopes to get updated allocatedBalance (all-time total)
        this.dashboardState.loadEnvelopes();
        this.savingId.set(null);
      },
      error: (err) => {
        // Revert on failure
        this.dashboardState.updateMonthlyAllocation(id, previousAllocation);
        input.value = String(previousAllocation);
        this.savingId.set(null);
        this.showError(err, 'Failed to update allocation');
      },
    });
  }

  /** Blur the input on Enter key */
  blurTarget(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  deleteEnvelope(id: string): void {
    this.deletingId.set(id);
    this.deletingType.set('envelope');
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    if (this.deletingType() === 'category') {
      const category = this.dashboardState.envelopeCategories().find(c => c.id === id);
      const removedEnvelopes = this.dashboardState.envelopes().filter(e => e.envelopeCategoryId === id);
      this.dashboardState.removeCategory(id);
      this.deletingId.set(null);

      this.categoryApi.deleteEnvelopeCategory(id).subscribe({
        error: (err) => {
          if (category) {
            this.dashboardState.addCategory(category);
            // Restore envelopes that were removed with the category
            for (const env of removedEnvelopes) {
              this.dashboardState.addEnvelope(env);
            }
          }
          this.showError(err, 'Failed to delete category');
        },
      });
    } else {
      const envelope = this.dashboardState.envelopes().find(e => e.id === id);
      this.dashboardState.removeEnvelope(id);
      this.deletingId.set(null);

      this.envelopeApi.deleteEnvelope(id).subscribe({
        error: (err) => {
          if (envelope) {
            this.dashboardState.addEnvelope(envelope);
          }
          this.showError(err, 'Failed to delete envelope');
        },
      });
    }
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
      error: (err) => {
        // Revert on failure
        this.dashboardState.updateEnvelope(id, original);
        if (input.type === 'number') {
          input.value = String(original.allocatedBalance);
        } else {
          input.value = original.name;
        }
        this.savingId.set(null);
        this.showError(err, 'Failed to update envelope');
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
    const envelope = this.dashboardState.envelopes().find(e => e.id === envelopeId);
    this.closePreview();
    if (envelope?.envelopeType === 'CC_PAYMENT' && envelope.linkedAccountId) {
      this.router.navigate(['/dashboard/transactions'], {
        queryParams: { accountId: envelope.linkedAccountId, highlightId: txn.id },
      });
    } else {
      this.router.navigate(['/dashboard/transactions'], {
        queryParams: { envelopeId, highlightId: txn.id },
      });
    }
  }

  onPreviewViewAll(): void {
    const id = this.activePreviewId();
    const envelope = this.dashboardState.envelopes().find(e => e.id === id);
    this.closePreview();
    if (envelope?.envelopeType === 'CC_PAYMENT' && envelope.linkedAccountId) {
      this.router.navigate(['/dashboard/transactions'], {
        queryParams: { accountId: envelope.linkedAccountId },
      });
    } else {
      this.router.navigate(['/dashboard/transactions'], {
        queryParams: { envelopeId: id },
      });
    }
  }

  private showError(err: unknown, fallback: string): void {
    const message = (err as { error?: { message?: string } })?.error?.message || fallback;
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
      panelClass: 'error-snackbar',
    });
  }
}
