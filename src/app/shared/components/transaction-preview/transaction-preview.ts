import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { fadeIn } from '../../animations/route-animations';

@Component({
  selector: 'app-transaction-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatIconModule],
  animations: [fadeIn],
  template: `
    <div class="preview-panel glass-card" @fadeIn>
      <div class="preview-header">
        <h4>{{ entityName() }}</h4>
        <span class="preview-subtitle">Recent transactions</span>
      </div>

      @if (transactions().length === 0) {
        <div class="preview-empty">
          <mat-icon>receipt_long</mat-icon>
          <span>No transactions yet</span>
        </div>
      } @else {
        <div class="preview-list">
          @for (txn of transactions(); track txn.id) {
            <button class="preview-item"
                    (click)="selectTransaction.emit(txn)"
                    [attr.aria-label]="(txn.description || 'Untitled') + ' ' + (txn.amount >= 0 ? '+' : '-') + '$' + abs(txn.amount)">
              <div class="preview-item-icon" [class.income]="txn.amount > 0">
                <mat-icon>{{ txn.amount > 0 ? 'arrow_downward' : 'arrow_upward' }}</mat-icon>
              </div>
              <div class="preview-item-details">
                <span class="preview-item-desc">{{ (!txn.transactionType || txn.transactionType === 'STANDARD') && txn.merchantName ? txn.merchantName : (txn.description || 'Untitled') }}</span>
                <span class="preview-item-date">{{ txn.transactionDate }}</span>
              </div>
              <span class="preview-item-amount"
                    [class.income]="txn.amount > 0"
                    [class.expense]="txn.amount < 0">
                {{ txn.amount >= 0 ? '+$' : '-$' }}{{ abs(txn.amount) | number: '1.2-2' }}
              </span>
            </button>
          }
        </div>
        <button class="preview-view-all"
                (click)="viewAll.emit()"
                aria-label="View all transactions">
          View all {{ totalCount() }} transactions
          <mat-icon>arrow_forward</mat-icon>
        </button>
      }
    </div>
  `,
  styles: `
    .preview-panel {
      padding: 0.75rem;
      min-width: 300px;
      max-width: 380px;
      max-height: 420px;
      overflow-y: auto;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(34, 211, 238, 0.08);
    }

    .preview-header {
      padding: 0.5rem 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      margin-bottom: 0.25rem;

      h4 {
        font-size: 0.95rem;
        font-weight: 600;
        margin: 0;
        letter-spacing: -0.01em;
      }
    }

    .preview-subtitle {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .preview-empty {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem 0.5rem;
      color: var(--text-muted);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .preview-list {
      display: flex;
      flex-direction: column;
    }

    .preview-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm, 8px);
      cursor: pointer;
      width: 100%;
      text-align: left;
      font-family: inherit;
      color: inherit;
      transition: background var(--transition-fast, 150ms);

      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary, #22d3ee);
        outline-offset: -2px;
      }
    }

    .preview-item-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(248, 113, 113, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: var(--danger, #f87171);
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.income {
        background: rgba(52, 211, 153, 0.12);

        mat-icon {
          color: var(--success, #34d399);
        }
      }
    }

    .preview-item-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .preview-item-desc {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-item-date {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .preview-item-amount {
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;

      &.income {
        color: var(--success, #34d399);
      }

      &.expense {
        color: var(--danger, #f87171);
      }
    }

    .preview-view-all {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem;
      border: none;
      background: transparent;
      color: var(--accent-primary, #22d3ee);
      font-size: 0.8rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      margin-top: 0.25rem;
      border-radius: 0 0 var(--radius-sm, 8px) var(--radius-sm, 8px);
      transition: background var(--transition-fast, 150ms);

      &:hover {
        background: rgba(34, 211, 238, 0.06);
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary, #22d3ee);
        outline-offset: -2px;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
  `,
})
export class TransactionPreview {
  readonly transactions = input.required<TransactionDTO[]>();
  readonly entityName = input.required<string>();
  readonly totalCount = input.required<number>();

  readonly selectTransaction = output<TransactionDTO>();
  readonly viewAll = output<void>();

  protected abs(value: number): number {
    return Math.abs(value);
  }
}
