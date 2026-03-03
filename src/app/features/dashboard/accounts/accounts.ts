import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { BankAccountControllerService } from '../../../core/api/api/bankAccountController.service';
import { BankAccountDTO } from '../../../core/api/model/bankAccountDTO';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateAccountDialog } from './create-account-dialog';
import { CCPaymentDialog } from './cc-payment-dialog';
import { ReconcileBalanceDialog } from './reconcile-balance-dialog';
import { PlaidAccountLinkDialog, PlaidAccountLinkDialogData } from './plaid-account-link-dialog';
import { PlaidService } from '../../../core/services/plaid.service';
import { TransactionPreview } from '../../../shared/components/transaction-preview/transaction-preview';
import { Counter } from '../../../shared/components/counter/counter';
import { SkeletonCard } from '../../../shared/components/skeleton-card/skeleton-card';
import {
  staggerFadeIn,
  slideInUp,
  scaleBounce,
  fadeIn,
} from '../../../shared/animations/route-animations';

@Component({
  selector: 'app-accounts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
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
          <h1>Accounts</h1>
          <p>Manage your linked bank accounts and credit cards</p>
        </div>
        @if (!dashboardState.loading() && dashboardState.accounts().length > 0) {
          <div class="header-actions">
            <button mat-stroked-button
                    class="connect-bank-btn"
                    (click)="connectBank()"
                    [disabled]="connectingBank()">
              @if (connectingBank()) {
                <mat-icon class="spin-icon">sync</mat-icon>
              } @else {
                <mat-icon>link</mat-icon>
              }
              Connect Bank
            </button>
            <div class="total-balance glass-card glow-card">
              <span class="total-label">Total Balance</span>
              <span class="total-value glow-text">
                <app-counter [targetValue]="dashboardState.totalBankBalance()" />
              </span>
            </div>
          </div>
        }
      </div>
    </div>

    @if (dashboardState.loading()) {
      <div class="accounts-grid">
        <app-skeleton-card [count]="3" height="180px" />
      </div>
    } @else if (dashboardState.accounts().length === 0) {
      <div class="empty-state glass-card" @scaleBounce>
        <mat-icon>account_balance</mat-icon>
        <h2>No accounts yet</h2>
        <p>Add your first bank account to start tracking your finances.</p>
        <div class="empty-state-actions">
          <button mat-flat-button color="primary" class="add-first-btn" (click)="connectBank()" [disabled]="connectingBank()">
            @if (connectingBank()) {
              <mat-icon class="spin-icon">sync</mat-icon>
            }
            Connect Your Bank
          </button>
          <button mat-stroked-button class="add-manual-btn" (click)="openCreateDialog()">
            Add Manually
          </button>
        </div>
      </div>
    } @else {
      <!-- Bank Accounts Section -->
      <section class="account-section">
        <div class="section-header">
          <div class="section-title-row">
            <mat-icon class="section-icon">account_balance</mat-icon>
            <h2>Bank Accounts</h2>
          </div>
          <span class="section-count">{{ bankAccountsList().length }} account{{ bankAccountsList().length !== 1 ? 's' : '' }}</span>
        </div>
        @if (bankAccountsList().length === 0) {
          <div class="section-empty glass-card">
            <mat-icon>account_balance</mat-icon>
            <p>No bank accounts yet. Add a checking or savings account to get started.</p>
          </div>
        } @else {
          <div class="accounts-grid" @staggerFadeIn>
            @for (account of bankAccountsList(); track account.id) {
              <div class="account-card glass-card neon-border">
                <div class="card-header">
                  <div class="card-icon"
                       [class.savings-icon]="account.accountType === 'SAVINGS'">
                    @if (account.accountType === 'SAVINGS') {
                      <mat-icon>savings</mat-icon>
                    } @else {
                      <mat-icon>account_balance</mat-icon>
                    }
                  </div>
                  <div class="card-badges">
                    @if (account.accountType === 'SAVINGS') {
                      <span class="account-type-badge savings-badge">Savings</span>
                    }
                    @if (!account.manual) {
                      <span class="account-type-badge linked-badge" title="Linked via Plaid">
                        <mat-icon class="badge-icon">link</mat-icon>
                        Linked
                      </span>
                    }
                  </div>
                  <button mat-icon-button class="delete-btn"
                          (click)="deleteAccount(account.id!)"
                          [attr.aria-label]="'Delete account ' + account.name">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>

                <div class="editable-field name-field">
                  <label class="sr-only" [attr.for]="'acct-name-' + account.id">Account name</label>
                  <input [id]="'acct-name-' + account.id"
                         class="inline-input name-input" type="text"
                         [value]="account.name"
                         (blur)="onNameBlur($event, account)"
                         (keydown.enter)="blurTarget($event)"
                         aria-label="Account name" />
                </div>

                @if (!account.manual && account.institutionName) {
                  <span class="institution-label">
                    {{ account.institutionName }}
                    @if (account.accountMask) { &bull; ••{{ account.accountMask }} }
                  </span>
                }

                @if (!account.manual) {
                  <div class="balance-field plaid-balance-display"
                       [attr.aria-label]="'Current balance (synced)'"
                       title="Balance is synced from your bank via Plaid">
                    <span class="currency-prefix">$</span>
                    <span class="balance-readonly">{{ account.currentBalance | currency:'USD':'':'1.2-2' }}</span>
                  </div>
                } @else {
                  <div class="editable-field balance-field">
                    <label class="sr-only" [attr.for]="'acct-balance-' + account.id">Current balance</label>
                    <span class="currency-prefix">$</span>
                    <input [id]="'acct-balance-' + account.id"
                           class="inline-input balance-input" type="number"
                           step="0.01" min="0"
                           [value]="account.currentBalance"
                           (blur)="onBalanceBlur($event, account)"
                           (keydown.enter)="blurTarget($event)"
                           aria-label="Current balance" />
                  </div>
                }

                @if (account.createdAt) {
                  <span class="card-date">Added {{ account.createdAt | date: 'mediumDate' }}</span>
                }

                @if (savingId() === account.id) {
                  <div class="save-indicator" @fadeIn><mat-icon>sync</mat-icon></div>
                }

                <button class="view-txn-link" cdkOverlayOrigin #iconOrigin="cdkOverlayOrigin"
                        (click)="togglePreview(account.id!)"
                        [attr.aria-label]="'View transactions for ' + account.name">
                  <mat-icon>receipt_long</mat-icon>
                  <span>{{ txnCountForAccount(account.id!) }} transactions</span>
                  <mat-icon class="link-arrow">chevron_right</mat-icon>
                </button>

                @if (!account.manual && account.plaidItemId) {
                  <div class="plaid-actions">
                    <button mat-stroked-button class="disconnect-btn"
                            (click)="disconnectPlaidItem(account.plaidItemId!)"
                            [attr.aria-label]="'Disconnect ' + account.name + ' from Plaid'">
                      <mat-icon>link_off</mat-icon> Disconnect
                    </button>
                  </div>
                }
              </div>

              <ng-template cdkConnectedOverlay
                           [cdkConnectedOverlayOrigin]="iconOrigin"
                           [cdkConnectedOverlayOpen]="activePreviewId() === account.id"
                           [cdkConnectedOverlayHasBackdrop]="true"
                           cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
                           (backdropClick)="closePreview()" (detach)="closePreview()"
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
      </section>

      <!-- Credit Cards Section -->
      <section class="account-section">
        <div class="section-header">
          <div class="section-title-row">
            <mat-icon class="section-icon cc-section-icon">credit_card</mat-icon>
            <h2>Credit Cards</h2>
          </div>
          <span class="section-count">{{ creditCardsList().length }} card{{ creditCardsList().length !== 1 ? 's' : '' }}</span>
        </div>
        @if (creditCardsList().length === 0) {
          <div class="section-empty glass-card">
            <mat-icon>credit_card</mat-icon>
            <p>No credit cards yet. Add a credit card to track your spending and debt.</p>
          </div>
        } @else {
          <div class="accounts-grid" @staggerFadeIn>
            @for (account of creditCardsList(); track account.id) {
              <div class="account-card glass-card neon-border credit-card-card">
                <div class="card-header">
                  <div class="card-icon cc-icon">
                    <mat-icon>credit_card</mat-icon>
                  </div>
                  <div class="card-badges">
                    <span class="account-type-badge cc-badge">Credit Card</span>
                    @if (!account.manual) {
                      <span class="account-type-badge linked-badge" title="Linked via Plaid">
                        <mat-icon class="badge-icon">link</mat-icon>
                        Linked
                      </span>
                    }
                  </div>
                  <button mat-icon-button class="delete-btn"
                          (click)="deleteAccount(account.id!)"
                          [attr.aria-label]="'Delete account ' + account.name">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>

                <div class="editable-field name-field">
                  <label class="sr-only" [attr.for]="'acct-name-' + account.id">Account name</label>
                  <input [id]="'acct-name-' + account.id"
                         class="inline-input name-input" type="text"
                         [value]="account.name"
                         (blur)="onNameBlur($event, account)"
                         (keydown.enter)="blurTarget($event)"
                         aria-label="Account name" />
                </div>

                @if (!account.manual && account.institutionName) {
                  <span class="institution-label">
                    {{ account.institutionName }}
                    @if (account.accountMask) { &bull; ••{{ account.accountMask }} }
                  </span>
                }

                <div class="balance-field cc-balance-display"
                     [class.debt-balance]="account.currentBalance > 0"
                     [attr.aria-label]="'Balance owed'"
                     title="Credit card balances update from transactions. Use 'Make Payment' or add transactions to adjust.">
                  <span class="currency-prefix">$</span>
                  <span class="balance-readonly">{{ account.currentBalance | currency:'USD':'':'1.2-2' }}</span>
                </div>
                @if (account.currentBalance > 0) {
                  <span class="debt-label">balance owed</span>
                }

                @if (getUncoveredDebt(account) > 0) {
                  <button class="uncovered-debt-warning"
                          (click)="navigateToEnvelopes()" role="status"
                          title="Allocate funds to the CC Payment envelope to cover this debt">
                    <mat-icon>warning_amber</mat-icon>
                    <span>{{ getUncoveredDebt(account) | currency:'USD':'symbol':'1.2-2' }} uncovered debt</span>
                    <mat-icon class="link-chevron">chevron_right</mat-icon>
                  </button>
                }

                @if (account.createdAt) {
                  <span class="card-date">Added {{ account.createdAt | date: 'mediumDate' }}</span>
                }

                @if (savingId() === account.id) {
                  <div class="save-indicator" @fadeIn><mat-icon>sync</mat-icon></div>
                }

                <button class="view-txn-link" cdkOverlayOrigin #iconOrigin="cdkOverlayOrigin"
                        (click)="togglePreview(account.id!)"
                        [attr.aria-label]="'View transactions for ' + account.name">
                  <mat-icon>receipt_long</mat-icon>
                  <span>{{ txnCountForAccount(account.id!) }} transactions</span>
                  <mat-icon class="link-arrow">chevron_right</mat-icon>
                </button>

                @if (account.currentBalance > 0) {
                  <button mat-stroked-button class="make-payment-btn"
                          (click)="openCCPaymentDialog(account)"
                          [attr.aria-label]="'Make payment on ' + account.name">
                    <mat-icon>payments</mat-icon> Make Payment
                  </button>
                }

                <button mat-stroked-button class="adjust-balance-btn"
                        (click)="openReconcileDialog(account)"
                        [attr.aria-label]="'Adjust balance for ' + account.name">
                  <mat-icon>tune</mat-icon> Adjust Balance
                </button>

                @if (!account.manual && account.plaidItemId) {
                  <div class="plaid-actions">
                    <button mat-stroked-button class="disconnect-btn"
                            (click)="disconnectPlaidItem(account.plaidItemId!)"
                            [attr.aria-label]="'Disconnect ' + account.name + ' from Plaid'">
                      <mat-icon>link_off</mat-icon> Disconnect
                    </button>
                  </div>
                }
              </div>

              <ng-template cdkConnectedOverlay
                           [cdkConnectedOverlayOrigin]="iconOrigin"
                           [cdkConnectedOverlayOpen]="activePreviewId() === account.id"
                           [cdkConnectedOverlayHasBackdrop]="true"
                           cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
                           (backdropClick)="closePreview()" (detach)="closePreview()"
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
      </section>
    }

    <button mat-fab
            color="primary"
            class="fab-add"
            (click)="openCreateDialog()"
            aria-label="Add new account">
      <mat-icon>add</mat-icon>
    </button>

    @if (deletingId()) {
      <div class="confirm-overlay" (click)="cancelDelete()" @slideInUp role="dialog" aria-label="Confirm deletion">
        <div class="confirm-card glass-card" (click)="$event.stopPropagation()">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
          <h3>Delete Account?</h3>
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

    .total-balance {
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

    .account-section {
      margin-bottom: 2rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-subtle);

      h2 {
        font-size: 1.1rem;
        font-weight: 600;
        letter-spacing: -0.01em;
      }
    }

    .section-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: var(--accent-primary);
    }

    .cc-section-icon {
      color: #fb923c;
    }

    .section-count {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .section-empty {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      color: var(--text-secondary);
      font-size: 0.9rem;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--text-muted);
        flex-shrink: 0;
      }

      p {
        margin: 0;
      }
    }

    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.25rem;
    }

    .account-card {
      padding: 1.5rem;
      position: relative;
      transition: transform var(--transition-fast), box-shadow var(--transition-base);

      &:hover {
        transform: translateY(-2px);
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: rgba(34, 211, 238, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: var(--accent-primary);
      }

      &.cc-icon {
        background: rgba(251, 146, 60, 0.12);

        mat-icon {
          color: #fb923c;
        }
      }

      &.savings-icon {
        background: rgba(74, 222, 128, 0.12);

        mat-icon {
          color: #4ade80;
        }
      }
    }

    .card-badges {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-left: auto;
    }

    .account-type-badge {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);

      &.cc-badge {
        background: rgba(251, 146, 60, 0.12);
        color: #fb923c;
      }

      &.savings-badge {
        background: rgba(74, 222, 128, 0.12);
        color: #4ade80;
      }
    }

    .credit-card-card {
      border-color: rgba(251, 146, 60, 0.2);
    }

    .debt-balance {
      .currency-prefix,
      .balance-input,
      .balance-readonly {
        color: #fb923c;
      }
    }

    .cc-balance-display {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      cursor: default;
    }

    .balance-readonly {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-primary);
      letter-spacing: -0.02em;
      padding: 0.25rem 0.5rem;
    }

    .debt-label {
      font-size: 0.7rem;
      color: #fb923c;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 500;
      margin-top: -0.25rem;
      margin-bottom: 0.25rem;
      padding-left: 0.5rem;
    }

    .make-payment-btn {
      width: 100%;
      margin-top: 0.5rem;
      color: #fb923c;
      border-color: rgba(251, 146, 60, 0.3);
      font-size: 0.8rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 0.25rem;
      }

      &:hover {
        background: rgba(251, 146, 60, 0.08);
      }
    }

    .adjust-balance-btn {
      width: 100%;
      margin-top: 0.35rem;
      color: var(--text-muted);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
      font-size: 0.8rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 0.25rem;
      }

      &:hover {
        color: #fb923c;
        border-color: rgba(251, 146, 60, 0.3);
        background: rgba(251, 146, 60, 0.04);
      }
    }

    .uncovered-debt-warning {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      padding: 0.4rem 0.6rem;
      margin-top: 0.25rem;
      border-radius: var(--radius-sm);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      font-size: 0.75rem;
      font-weight: 500;
      font-family: inherit;
      color: #ef4444;
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #ef4444;
      }

      .link-chevron {
        margin-left: auto;
        opacity: 0;
        transition: opacity var(--transition-fast);
      }

      &:hover {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.35);

        .link-chevron {
          opacity: 1;
        }
      }

      &:focus-visible {
        outline: 2px solid #ef4444;
        outline-offset: -2px;
      }
    }

    .delete-btn {
      color: var(--text-muted);
      opacity: 0;
      transition: opacity var(--transition-fast), color var(--transition-fast);

      .account-card:hover & {
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
        border-color: rgba(34, 211, 238, 0.2);
      }

      &:focus {
        border-color: var(--accent-primary, #22d3ee);
        background: rgba(34, 211, 238, 0.06);
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
      color: var(--accent-primary);
      margin-right: 0.1rem;
      flex-shrink: 0;
    }

    .balance-input {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-primary);
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
        color: var(--accent-primary);
        background: rgba(34, 211, 238, 0.04);

        .link-arrow {
          opacity: 1;
          transform: translateX(2px);
        }
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary);
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
        color: var(--accent-primary);
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
        color: var(--accent-primary);
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
        0 4px 20px rgba(34, 211, 238, 0.3),
        0 0 40px rgba(34, 211, 238, 0.15);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);

      &:hover {
        transform: scale(1.1);
        box-shadow:
          0 6px 30px rgba(34, 211, 238, 0.4),
          0 0 60px rgba(34, 211, 238, 0.2);
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

    /* ─── Plaid / Connect Bank styles ───────────────────────────── */

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .connect-bank-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--accent-primary);
      border-color: rgba(34, 211, 238, 0.3);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        background: rgba(34, 211, 238, 0.08);
      }
    }

    .empty-state-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
    }

    .add-manual-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .linked-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      background: rgba(34, 211, 238, 0.12);
      color: var(--accent-primary);

      .badge-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .institution-label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      padding-left: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .plaid-balance-display {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      cursor: default;
    }

    .plaid-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .sync-btn {
      flex: 1;
      color: var(--accent-primary);
      border-color: rgba(34, 211, 238, 0.25);
      font-size: 0.8rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 0.25rem;
      }

      &:hover:not(:disabled) {
        background: rgba(34, 211, 238, 0.06);
      }
    }

    .disconnect-btn {
      flex: 1;
      color: var(--text-muted);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
      font-size: 0.8rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 0.25rem;
      }

      &:hover {
        color: var(--danger);
        border-color: rgba(239, 68, 68, 0.3);
        background: rgba(239, 68, 68, 0.04);
      }
    }

    .spin-icon {
      animation: spin 0.8s linear infinite;
    }
  `,
})
export class Accounts implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly bankAccountApi = inject(BankAccountControllerService);
  private readonly plaidService = inject(PlaidService);
  private readonly router = inject(Router);

  protected readonly deletingId = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);
  protected readonly activePreviewId = signal<string | null>(null);
  protected readonly connectingBank = signal(false);

  protected readonly bankAccountsList = computed(() =>
    this.dashboardState.accounts().filter(a => a.accountType !== 'CREDIT_CARD')
  );

  protected readonly creditCardsList = computed(() =>
    this.dashboardState.accounts().filter(a => a.accountType === 'CREDIT_CARD')
  );

  protected readonly previewPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  ];

  protected readonly previewTransactions = computed(() => {
    const id = this.activePreviewId();
    if (!id) return [];
    return this.dashboardState.transactions()
      .filter(t => t.bankAccountId === id)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .slice(0, 5);
  });

  protected readonly previewTotalCount = computed(() => {
    const id = this.activePreviewId();
    if (!id) return 0;
    return this.dashboardState.transactions().filter(t => t.bankAccountId === id).length;
  });

  protected readonly previewEntityName = computed(() => {
    const id = this.activePreviewId();
    if (!id) return '';
    return this.dashboardState.accounts().find(a => a.id === id)?.name ?? '';
  });

  protected readonly txnCountMap = computed(() => {
    const map: Record<string, number> = {};
    for (const t of this.dashboardState.transactions()) {
      map[t.bankAccountId] = (map[t.bankAccountId] ?? 0) + 1;
    }
    return map;
  });

  txnCountForAccount(accountId: string): number {
    return this.txnCountMap()[accountId] ?? 0;
  }

  getUncoveredDebt(account: BankAccountDTO): number {
    if (account.accountType !== 'CREDIT_CARD' || !account.id) return 0;
    return this.dashboardState.uncoveredDebtByCard().get(account.id) ?? 0;
  }

  ngOnInit(): void {
    // Data is loaded by the layout, but refresh if empty
    if (this.dashboardState.accounts().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.refresh();
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateAccountDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dashboardState.addAccount(result);
        this.dashboardState.loadTransactions();
        // If a CC was created, refresh to pick up auto-created CC Payment envelope
        if (result.accountType === 'CREDIT_CARD') {
          this.dashboardState.refresh();
        }
      }
    });
  }

  openCCPaymentDialog(creditCard: BankAccountDTO): void {
    const dialogRef = this.dialog.open(CCPaymentDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
      data: { creditCard },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Dashboard already refreshed inside the dialog on success
      }
    });
  }

  openReconcileDialog(account: BankAccountDTO): void {
    const dialogRef = this.dialog.open(ReconcileBalanceDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
      data: { account },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Account and transactions already updated inside the dialog on success
      }
    });
  }

  /** Auto-save name on blur */
  onNameBlur(event: Event, account: BankAccountDTO): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (!newName) {
      // Revert empty names
      input.value = account.name;
      return;
    }
    if (newName === account.name) return;

    const updated: BankAccountDTO = { ...account, name: newName };
    this.saveAccount(account, updated, input);
  }

  /** Auto-save balance on blur */
  onBalanceBlur(event: Event, account: BankAccountDTO): void {
    if (account.accountType === 'CREDIT_CARD') return;
    const input = event.target as HTMLInputElement;
    const newBalance = parseFloat(input.value);
    if (isNaN(newBalance) || newBalance < 0) {
      // Revert invalid values
      input.value = String(account.currentBalance);
      return;
    }
    if (newBalance === account.currentBalance) return;

    const updated: BankAccountDTO = { ...account, currentBalance: newBalance };
    this.saveAccount(account, updated, input);
  }

  /** Blur the input on Enter key */
  blurTarget(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  deleteAccount(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    this.bankAccountApi.deleteBankAccount(id).subscribe({
      next: () => {
        const account = this.dashboardState.accounts().find(a => a.id === id);
        this.dashboardState.removeAccount(id);
        this.dashboardState.removeTransactionsForAccount(id);
        // If a CC was deleted, refresh envelopes/categories (backend cascades CC Payment envelope)
        if (account?.accountType === 'CREDIT_CARD') {
          this.dashboardState.loadEnvelopes();
          this.dashboardState.loadAll();
        }
        this.deletingId.set(null);
      },
      error: () => {
        this.deletingId.set(null);
      },
    });
  }

  private saveAccount(original: BankAccountDTO, updated: BankAccountDTO, input: HTMLInputElement): void {
    const id = original.id!;
    this.savingId.set(id);

    // Optimistic update — immediately propagates to totalBankBalance, unallocatedAmount, etc.
    this.dashboardState.updateAccount(id, updated);

    this.bankAccountApi.updateBankAccount(id, updated).subscribe({
      next: (saved) => {
        // Reconcile with server response
        this.dashboardState.updateAccount(id, saved);
        this.savingId.set(null);
        // Refresh transactions to pick up any Adjustment transaction created by the backend
        if (original.currentBalance !== updated.currentBalance) {
          this.dashboardState.loadTransactions();
        }
        // Refresh envelopes so the CC_PAYMENT envelope name stays in sync
        if (original.name !== updated.name && saved.accountType === 'CREDIT_CARD') {
          this.dashboardState.loadEnvelopes();
        }
      },
      error: () => {
        // Revert on failure
        this.dashboardState.updateAccount(id, original);
        if (input.type === 'number') {
          input.value = String(original.currentBalance);
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
    this.closePreview();
    this.router.navigate(['/dashboard/transactions'], {
      queryParams: { bankAccountId: txn.bankAccountId, highlightId: txn.id },
    });
  }

  onPreviewViewAll(): void {
    const id = this.activePreviewId();
    this.closePreview();
    this.router.navigate(['/dashboard/transactions'], {
      queryParams: { bankAccountId: id },
    });
  }

  navigateToEnvelopes(): void {
    this.router.navigate(['/dashboard/envelopes']);
  }

  // ─── Plaid integration ──────────────────────────────────────────

  async connectBank(): Promise<void> {
    this.connectingBank.set(true);
    try {
      const result = await this.plaidService.openPlaidLink();

      // Open the account-mapping dialog
      const dialogRef = this.dialog.open(PlaidAccountLinkDialog, {
        width: '520px',
        panelClass: 'dark-dialog',
        disableClose: true,
        data: {
          publicToken: result.publicToken,
          institutionId: result.metadata.institution.institution_id,
          institutionName: result.metadata.institution.name,
          plaidAccounts: result.metadata.accounts,
        } satisfies PlaidAccountLinkDialogData,
      });

      dialogRef.afterClosed().subscribe((linked) => {
        if (linked) {
          // DashboardStateService.refresh() is already called inside the dialog
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      // Don't show an error if the user just dismissed the modal
      if (message !== 'PLAID_LINK_DISMISSED') {
        console.error('Plaid Link error:', err);
      }
    } finally {
      this.connectingBank.set(false);
    }
  }

  disconnectPlaidItem(plaidItemId: string): void {
    this.plaidService.unlinkItem(plaidItemId).subscribe({
      next: () => {
        this.dashboardState.refresh();
      },
      error: (err) => {
        console.error('Failed to disconnect Plaid item:', err);
      },
    });
  }
}
