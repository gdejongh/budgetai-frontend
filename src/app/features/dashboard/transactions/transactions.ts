import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { CreateTransactionDialog } from './create-transaction-dialog';
import {
  EditTransactionDialog,
  EditTransactionDialogResult,
} from './edit-transaction-dialog';
import { SkeletonCard } from '../../../shared/components/skeleton-card/skeleton-card';
import {
  slideInUp,
  scaleBounce,
  fadeIn,
} from '../../../shared/animations/route-animations';

type SortColumn = 'description' | 'account' | 'envelope' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-transactions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    DatePipe,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    SkeletonCard,
  ],
  animations: [slideInUp, scaleBounce, fadeIn],
  template: `
    <div class="page-header" @slideInUp>
      <div class="header-row">
        <div>
          <h1>Transactions</h1>
          <p>View and manage your financial transactions</p>
        </div>
        @if (!dashboardState.loading() && dashboardState.transactions().length > 0) {
          <div class="transaction-count glass-card glow-card">
            <span class="count-label">{{ hasActiveFilters() ? 'Showing' : 'Total' }}</span>
            <span class="count-value glow-text">{{ hasActiveFilters() ? sortedTransactions().length : dashboardState.transactionCount() }}</span>
          </div>
        }
      </div>
    </div>

    @if (filterLabel()) {
      <div class="filter-bar glass-card" @fadeIn>
        <mat-icon class="filter-bar-icon">filter_list</mat-icon>
        <span class="filter-bar-label">{{ filterLabel() }}</span>
        <button mat-icon-button class="filter-bar-clear" (click)="clearFilter()" aria-label="Clear filter">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }

    @if (!dashboardState.loading() && dashboardState.transactions().length > 0) {
      <div class="search-bar glass-card" @fadeIn>
        <mat-icon class="search-icon">search</mat-icon>
        <input type="text"
               placeholder="Search by merchant, description, account, or envelope..."
               [ngModel]="searchQuery()"
               (ngModelChange)="searchQuery.set($event)"
               aria-label="Search transactions" />
        @if (searchQuery()) {
          <button mat-icon-button class="search-clear" (click)="searchQuery.set('')" aria-label="Clear search">
            <mat-icon>close</mat-icon>
          </button>
        }
      </div>
    }

    @if (dashboardState.loading()) {
      <div class="skeleton-list">
        <app-skeleton-card [count]="4" height="80px" />
      </div>
    } @else if (sortedTransactions().length === 0 && (filterLabel() || searchQuery())) {
      <div class="empty-state glass-card" @scaleBounce>
        <mat-icon>filter_list_off</mat-icon>
        <h2>No matching transactions</h2>
        <p>There are no transactions matching your {{ searchQuery() ? 'search' : 'filter' }}.</p>
        <button mat-flat-button color="primary" (click)="clearAllFilters()">Clear {{ searchQuery() ? 'Search' : 'Filter' }}</button>
      </div>
    } @else if (dashboardState.transactions().length === 0) {
      <div class="empty-state glass-card" @scaleBounce>
        <mat-icon>receipt_long</mat-icon>
        <h2>No transactions yet</h2>
        <p>Add your first transaction to start tracking your spending.</p>
        <button mat-flat-button color="primary" class="add-first-btn" (click)="openCreateDialog()">
          Add Your First Transaction
        </button>
      </div>
    } @else {
      <div class="table-container glass-card neon-border" @fadeIn>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="col-description sortable"
                    [class.active]="sortColumn() === 'description'"
                    [attr.aria-sort]="ariaSort('description')"
                    (click)="toggleSort('description')"
                    (keydown.enter)="toggleSort('description')"
                    tabindex="0"
                    role="columnheader">
                  <span class="th-content">
                    Description
                    <mat-icon class="sort-icon">{{ sortIcon('description') }}</mat-icon>
                  </span>
                </th>
                <th class="col-account sortable"
                    [class.active]="sortColumn() === 'account'"
                    [attr.aria-sort]="ariaSort('account')"
                    (click)="toggleSort('account')"
                    (keydown.enter)="toggleSort('account')"
                    tabindex="0"
                    role="columnheader">
                  <span class="th-content">
                    Account
                    <mat-icon class="sort-icon">{{ sortIcon('account') }}</mat-icon>
                  </span>
                </th>
                <th class="col-envelope sortable"
                    [class.active]="sortColumn() === 'envelope'"
                    [attr.aria-sort]="ariaSort('envelope')"
                    (click)="toggleSort('envelope')"
                    (keydown.enter)="toggleSort('envelope')"
                    tabindex="0"
                    role="columnheader">
                  <span class="th-content">
                    Envelope
                    <mat-icon class="sort-icon">{{ sortIcon('envelope') }}</mat-icon>
                  </span>
                </th>
                <th class="col-date sortable"
                    [class.active]="sortColumn() === 'date'"
                    [attr.aria-sort]="ariaSort('date')"
                    (click)="toggleSort('date')"
                    (keydown.enter)="toggleSort('date')"
                    tabindex="0"
                    role="columnheader">
                  <span class="th-content">
                    Date
                    <mat-icon class="sort-icon">{{ sortIcon('date') }}</mat-icon>
                  </span>
                </th>
                <th class="col-amount sortable"
                    [class.active]="sortColumn() === 'amount'"
                    [attr.aria-sort]="ariaSort('amount')"
                    (click)="toggleSort('amount')"
                    (keydown.enter)="toggleSort('amount')"
                    tabindex="0"
                    role="columnheader">
                  <span class="th-content">
                    Amount
                    <mat-icon class="sort-icon">{{ sortIcon('amount') }}</mat-icon>
                  </span>
                </th>
                <th class="col-actions" role="columnheader">
                  <span class="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (transaction of paginatedTransactions(); track transaction.id) {
                <tr [attr.data-txn-id]="transaction.id"
                    tabindex="0"
                    role="button"
                    [attr.aria-label]="'Edit transaction: ' + (transaction.description || 'Untitled') + ', ' + (transaction.amount >= 0 ? '+' : '-') + '$' + absAmount(transaction.amount)"
                    (click)="openEditDialog($event, transaction)"
                    (keydown.enter)="openEditDialog($event, transaction)">
                  <td class="col-description">
                    <div class="description-cell">
                      @if (transaction.merchantName && (!transaction.transactionType || transaction.transactionType === 'STANDARD')) {
                        <span class="cell-merchant">{{ transaction.merchantName }}</span>
                        @if (transaction.description && transaction.description !== transaction.merchantName) {
                          <span class="cell-description">{{ transaction.description }}</span>
                        }
                      } @else {
                        <span class="cell-description">{{ transaction.description || 'Untitled' }}</span>
                      }
                      @if (transaction.transactionType === 'CC_PAYMENT') {
                        <span class="cc-payment-badge" title="Credit card payment">
                          <mat-icon>link</mat-icon>
                          CC Payment
                        </span>
                      }
                      @if (transaction.transactionType === 'TRANSFER') {
                        <span class="transfer-badge" title="Account transfer">
                          <mat-icon>swap_horiz</mat-icon>
                          Transfer
                        </span>
                      }
                    </div>
                  </td>
                  <td class="col-account">
                    <span class="cell-account">
                      @if (isAccountCreditCard(transaction.bankAccountId)) {
                        <mat-icon class="account-type-icon cc-icon-inline">credit_card</mat-icon>
                      }
                      {{ accountNameMap()[transaction.bankAccountId] || 'Unknown' }}
                    </span>
                  </td>
                  <td class="col-envelope">
                    <span class="cell-envelope">{{ transaction.envelopeId ? (envelopeNameMap()[transaction.envelopeId] || 'Unknown') : 'No envelope' }}</span>
                  </td>
                  <td class="col-date">
                    {{ formatDate(transaction.transactionDate) | date:'MMM d, yyyy' }}
                  </td>
                  <td class="col-amount">
                    <span class="cell-amount"
                          [class.income]="transaction.amount > 0"
                          [class.expense]="transaction.amount < 0">
                      {{ transaction.amount >= 0 ? '+$' : '-$' }}{{ absAmount(transaction.amount) | number:'1.2-2' }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button mat-icon-button
                            class="delete-btn"
                            (click)="deleteTransaction($event, transaction.id!)"
                            [attr.aria-label]="'Delete transaction ' + (transaction.description || 'Untitled')">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1 || sortedTransactions().length > 25) {
          <div class="pagination-bar">
            <div class="page-size-select">
              <label for="pageSize">Rows:</label>
              <select id="pageSize"
                      [ngModel]="pageSize()"
                      (ngModelChange)="pageSize.set($event)"
                      aria-label="Rows per page">
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
            </div>
            <span class="page-info">
              {{ pageStart() }}–{{ pageEnd() }} of {{ sortedTransactions().length }}
            </span>
            <div class="page-nav">
              <button mat-icon-button
                      [disabled]="currentPage() === 0"
                      (click)="currentPage.set(currentPage() - 1)"
                      aria-label="Previous page">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <button mat-icon-button
                      [disabled]="currentPage() >= totalPages() - 1"
                      (click)="currentPage.set(currentPage() + 1)"
                      aria-label="Next page">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <button mat-fab
            color="primary"
            class="fab-add"
            (click)="openCreateDialog()"
            aria-label="Add new transaction">
      <mat-icon>add</mat-icon>
    </button>

    @if (deletingId()) {
      <div class="confirm-overlay" (click)="cancelDelete()" @slideInUp role="dialog" aria-label="Confirm deletion">
        <div class="confirm-card glass-card" (click)="$event.stopPropagation()">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
          <h3>Delete Transaction?</h3>
          @if (isDeletingCCPayment()) {
            <p>This is a credit card payment. Both the bank and credit card sides will be deleted.</p>
          } @else if (isDeletingTransfer()) {
            <p>This is an account transfer. Both sides of the transfer will be deleted.</p>
          } @else {
            <p>This action cannot be undone.</p>
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

    .transaction-count {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 1rem 1.5rem;
      min-width: 100px;
    }

    .count-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .count-value {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    /* ---- Search bar ---- */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem 0.5rem 1rem;
      margin-bottom: 1.25rem;
      max-width: 480px;

      input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 0.9rem;
        font-family: inherit;

        &::placeholder {
          color: var(--text-muted);
        }
      }
    }

    .search-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .search-clear {
      width: 28px;
      height: 28px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    /* ---- Filter bar ---- */
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem 0.5rem 1rem;
      margin-bottom: 1.25rem;
      max-width: fit-content;
    }

    .filter-bar-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent-primary);
    }

    .filter-bar-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .filter-bar-clear {
      width: 28px;
      height: 28px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    /* ---- Skeleton list ---- */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* ---- Table ---- */
    .table-container {
      overflow: hidden;
    }

    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    /* Column widths */
    .col-description { width: 28%; }
    .col-account { width: 18%; }
    .col-envelope { width: 18%; }
    .col-date { width: 14%; }
    .col-amount { width: 14%; }
    .col-actions { width: 8%; }

    thead th {
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border-default);
      user-select: none;
      position: relative;

      &.sortable {
        cursor: pointer;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--text-primary);
        }

        &:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: -2px;
        }

        &.active {
          color: var(--accent-primary);
        }
      }
    }

    .th-content {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .sort-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      transition: color var(--transition-fast), transform var(--transition-fast);

      .active & {
        color: var(--accent-primary);
      }
    }

    tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--bg-card-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: -2px;
      }
    }

    tbody td {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      color: var(--text-primary);
      vertical-align: middle;
    }

    .cell-description {
      display: block;
      font-weight: 600;
      letter-spacing: -0.01em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cell-account {
      color: var(--accent-primary);
      font-weight: 500;
      font-size: 0.85rem;
    }

    .cell-envelope {
      color: var(--accent-secondary, var(--text-secondary));
      font-weight: 500;
      font-size: 0.85rem;
    }

    .col-date {
      color: var(--text-secondary);
      font-size: 0.85rem;
      white-space: nowrap;
    }

    .cell-amount {
      font-weight: 700;
      letter-spacing: -0.02em;
      white-space: nowrap;

      &.income {
        color: var(--success);
      }

      &.expense {
        color: var(--danger);
      }
    }

    .col-amount {
      text-align: right;
    }

    thead .col-amount {
      .th-content {
        justify-content: flex-end;
      }
    }

    .col-actions {
      text-align: center;
    }

    .delete-btn {
      color: var(--text-muted);
      opacity: 0;
      transition: opacity var(--transition-fast), color var(--transition-fast);

      tr:hover & {
        opacity: 1;
      }

      &:hover {
        color: var(--danger);
      }
    }

    /* ---- Pagination ---- */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1.5rem;
      padding: 0.625rem 1rem;
      border-top: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .page-size-select {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      label {
        color: var(--text-muted);
        font-size: 0.8rem;
      }

      select {
        background: var(--bg-input);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-size: 0.8rem;
        padding: 0.25rem 0.5rem;
        font-family: inherit;
        cursor: pointer;

        &:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 1px;
        }
      }
    }

    .page-info {
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .page-nav {
      display: flex;
      gap: 0.25rem;

      button {
        width: 32px;
        height: 32px;
      }
    }

    /* ---- Empty state ---- */
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

    /* ---- FAB ---- */
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

    /* ---- Delete confirm overlay ---- */
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

    /* ---- Highlight pulse for navigated-to row ---- */
    .highlight-pulse {
      animation: highlightPulse 2s ease-out !important;
    }

    @keyframes highlightPulse {
      0%, 15% {
        box-shadow: inset 0 0 0 2px rgba(34, 211, 238, 0.6);
        background: rgba(34, 211, 238, 0.08);
      }
      100% {
        box-shadow: none;
        background: transparent;
      }
    }

    /* ---- Visually hidden (a11y) ---- */
    .visually-hidden {
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

    /* ---- Mobile responsive ---- */
    @media (max-width: 600px) {
      .table-scroll {
        min-width: 0;
      }

      table {
        min-width: 640px;
      }

      .search-bar {
        max-width: 100%;
      }

      .delete-btn {
        opacity: 1;
      }

      .pagination-bar {
        gap: 0.75rem;
        flex-wrap: wrap;
        justify-content: center;
      }
    }

    /* Touch devices: always show delete button */
    @media (hover: none) {
      .delete-btn {
        opacity: 1;
      }
    }

    /* ---- CC Payment badge ---- */
    .description-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .cell-merchant {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .cell-merchant + .cell-description {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .cc-payment-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      background: rgba(251, 146, 60, 0.12);
      color: #fb923c;
      white-space: nowrap;
      flex-shrink: 0;
      width: fit-content;

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .transfer-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      background: rgba(129, 140, 248, 0.12);
      color: #818cf8;
      white-space: nowrap;
      flex-shrink: 0;
      width: fit-content;

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .account-type-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      vertical-align: middle;
      margin-right: 4px;

      &.cc-icon-inline {
        color: #fb923c;
      }
    }
  `,
})
export class Transactions implements OnInit {
  protected readonly dashboardState = inject(DashboardStateService);
  private readonly dialog = inject(MatDialog);
  private readonly transactionApi = inject(TransactionControllerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ---- UI state ----
  protected readonly deletingId = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly sortColumn = signal<SortColumn>('date');
  protected readonly sortDirection = signal<SortDirection>('desc');
  protected readonly pageSize = signal(25);
  protected readonly currentPage = signal(0);

  // ---- Query params ----
  private readonly queryParams = toSignal(this.route.queryParamMap);

  protected readonly filterBankAccountId = computed(() =>
    this.queryParams()?.get('bankAccountId') ?? null
  );

  protected readonly filterEnvelopeId = computed(() =>
    this.queryParams()?.get('envelopeId') ?? null
  );

  private readonly highlightId = computed(() =>
    this.queryParams()?.get('highlightId') ?? null
  );

  // ---- Name maps ----
  protected readonly accountNameMap = computed(() => {
    const map: Record<string, string> = {};
    for (const a of this.dashboardState.accounts()) {
      if (a.id) map[a.id] = a.name;
    }
    return map;
  });

  private readonly accountTypeMap = computed(() => {
    const map: Record<string, string> = {};
    for (const a of this.dashboardState.accounts()) {
      if (a.id) map[a.id] = a.accountType ?? 'CHECKING';
    }
    return map;
  });

  protected readonly isDeletingCCPayment = computed(() => {
    const id = this.deletingId();
    if (!id) return false;
    const txn = this.dashboardState.transactions().find(t => t.id === id);
    return txn?.transactionType === 'CC_PAYMENT';
  });

  protected readonly isDeletingTransfer = computed(() => {
    const id = this.deletingId();
    if (!id) return false;
    const txn = this.dashboardState.transactions().find(t => t.id === id);
    return txn?.transactionType === 'TRANSFER';
  });

  isAccountCreditCard(accountId: string): boolean {
    return this.accountTypeMap()[accountId] === 'CREDIT_CARD';
  }

  protected readonly envelopeNameMap = computed(() => {
    const map: Record<string, string> = {};
    for (const e of this.dashboardState.envelopes()) {
      if (e.id) map[e.id] = e.name;
    }
    return map;
  });

  // ---- Data pipeline ----
  protected readonly filteredTransactions = computed(() => {
    const txns = this.dashboardState.transactions();
    const bankAccountId = this.filterBankAccountId();
    const envelopeId = this.filterEnvelopeId();
    if (bankAccountId) return txns.filter(t => t.bankAccountId === bankAccountId);
    if (envelopeId) return txns.filter(t => t.envelopeId === envelopeId);
    return txns;
  });

  protected readonly searchedTransactions = computed(() => {
    const txns = this.filteredTransactions();
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return txns;

    const accMap = this.accountNameMap();
    const envMap = this.envelopeNameMap();

    return txns.filter(t => {
      const desc = (t.description ?? '').toLowerCase();
      const merchant = (t.merchantName ?? '').toLowerCase();
      const accName = (accMap[t.bankAccountId] ?? '').toLowerCase();
      const envName = (t.envelopeId ? (envMap[t.envelopeId] ?? '') : '').toLowerCase();
      return desc.includes(query) || merchant.includes(query) || accName.includes(query) || envName.includes(query);
    });
  });

  protected readonly sortedTransactions = computed(() => {
    const txns = [...this.searchedTransactions()];
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const accMap = this.accountNameMap();
    const envMap = this.envelopeNameMap();
    const mult = dir === 'asc' ? 1 : -1;

    return txns.sort((a, b) => {
      let cmp = 0;
      switch (col) {
        case 'description':
          cmp = (a.description ?? '').localeCompare(b.description ?? '');
          break;
        case 'account':
          cmp = (accMap[a.bankAccountId] ?? '').localeCompare(accMap[b.bankAccountId] ?? '');
          break;
        case 'envelope': {
          const envA = a.envelopeId ? (envMap[a.envelopeId] ?? '') : '';
          const envB = b.envelopeId ? (envMap[b.envelopeId] ?? '') : '';
          cmp = envA.localeCompare(envB);
          break;
        }
        case 'date':
          cmp = a.transactionDate.localeCompare(b.transactionDate);
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
      }
      return cmp * mult;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.ceil(this.sortedTransactions().length / this.pageSize()) || 1
  );

  protected readonly paginatedTransactions = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.sortedTransactions().slice(start, start + this.pageSize());
  });

  protected readonly pageStart = computed(() =>
    this.sortedTransactions().length === 0 ? 0 : this.currentPage() * this.pageSize() + 1
  );

  protected readonly pageEnd = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.sortedTransactions().length)
  );

  // ---- Filter helpers ----
  protected readonly isFiltered = computed(() =>
    !!this.filterBankAccountId() || !!this.filterEnvelopeId()
  );

  protected readonly hasActiveFilters = computed(() =>
    this.isFiltered() || !!this.searchQuery().trim()
  );

  protected readonly filterLabel = computed(() => {
    const bankAccountId = this.filterBankAccountId();
    const envelopeId = this.filterEnvelopeId();
    if (bankAccountId) {
      const name = this.accountNameMap()[bankAccountId];
      return name ? `Account: ${name}` : 'Filtered by account';
    }
    if (envelopeId) {
      const name = this.envelopeNameMap()[envelopeId];
      return name ? `Envelope: ${name}` : 'Filtered by envelope';
    }
    return null;
  });

  constructor() {
    // Reset page when filters/sort/search change
    effect(() => {
      // Read all the signals that should trigger a page reset
      this.searchQuery();
      this.filterBankAccountId();
      this.filterEnvelopeId();
      this.sortColumn();
      this.sortDirection();
      this.pageSize();
      // Reset page in untracked context to avoid circular dependency
      untracked(() => this.currentPage.set(0));
    });

    // Highlight a specific transaction after navigation
    effect(() => {
      const id = this.highlightId();
      if (!id) return;
      setTimeout(() => {
        const el = document.querySelector(`[data-txn-id="${id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
          this.router.navigate([], {
            queryParams: { highlightId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      }, 300);
    });
  }

  ngOnInit(): void {
    if (this.dashboardState.transactions().length === 0 && !this.dashboardState.loading()) {
      this.dashboardState.loadTransactions();
    }
  }

  // ---- Sort ----

  toggleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(column: SortColumn): string {
    if (this.sortColumn() !== column) return 'unfold_more';
    return this.sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  ariaSort(column: SortColumn): string {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  // ---- Helpers ----

  /** Returns the absolute value of an amount for display */
  absAmount(amount: number): number {
    return Math.abs(amount);
  }

  /** Parse a YYYY-MM-DD string into a Date for the DatePipe */
  formatDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // ---- Dialogs ----

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateTransactionDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      // Transfer result: { transfer: true, transactions: [source, dest] }
      if (result.transfer && result.transactions?.length === 2) {
        this.dashboardState.addTransfer(result.transactions[0], result.transactions[1]);
        return;
      }

      // Regular transaction result
      this.dashboardState.addTransaction(result);

      // If a CC transaction was created with an envelope, reload envelopes
      // so the CC Payment envelope's allocatedBalance reflects the coverage.
      if (this.dashboardState.isCreditCard(result.bankAccountId) && result.envelopeId) {
        this.dashboardState.loadEnvelopes();
      }
    });
  }

  openEditDialog(event: Event, transaction: TransactionDTO): void {
    // Prevent the edit dialog from opening when clicking the delete button
    const target = event.target as HTMLElement;
    if (target.closest('.delete-btn')) return;

    // CC_PAYMENT and TRANSFER transactions are system-managed linked pairs and cannot be edited
    if (transaction.transactionType === 'CC_PAYMENT' || transaction.transactionType === 'TRANSFER') return;

    const dialogRef = this.dialog.open(EditTransactionDialog, {
      width: '440px',
      panelClass: 'dark-dialog',
      data: { transaction },
    });

    dialogRef.afterClosed().subscribe((result: EditTransactionDialogResult | undefined) => {
      if (result) {
        this.dashboardState.updateTransaction(result.saved.id!, result.original, result.saved);

        // If envelope assignment changed on a CC transaction, reload envelopes
        // so the CC Payment envelope's allocatedBalance is up to date.
        const isCCTxn = this.dashboardState.isCreditCard(result.saved.bankAccountId)
          || this.dashboardState.isCreditCard(result.original.bankAccountId);
        const envelopeChanged = result.original.envelopeId !== result.saved.envelopeId;
        if (isCCTxn && envelopeChanged) {
          this.dashboardState.loadEnvelopes();
        }
      }
    });
  }

  // ---- Delete flow ----

  deleteTransaction(event: Event, id: string): void {
    event.stopPropagation();
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    // Capture transaction details before removal for post-delete logic
    const txn = this.dashboardState.transactions().find(t => t.id === id);

    this.transactionApi.deleteTransaction(id).subscribe({
      next: () => {
        this.dashboardState.removeTransaction(id);
        this.deletingId.set(null);

        // If a CC transaction with an envelope was deleted, reload envelopes
        // so the CC Payment envelope's allocatedBalance is updated.
        if (txn && this.dashboardState.isCreditCard(txn.bankAccountId) && txn.envelopeId) {
          this.dashboardState.loadEnvelopes();
        }
      },
      error: () => {
        this.deletingId.set(null);
      },
    });
  }

  // ---- Filter / Clear ----

  clearFilter(): void {
    this.router.navigate(['/dashboard/transactions']);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    if (this.isFiltered()) {
      this.router.navigate(['/dashboard/transactions']);
    }
  }
}
