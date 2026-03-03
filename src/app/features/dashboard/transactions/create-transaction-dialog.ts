import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { provideNativeDateAdapter } from '@angular/material/core';

import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { TransactionDTO } from '../../../core/api/model/transactionDTO';
import { TransferRequest } from '../../../core/api/model/transferRequest';
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
    MatAutocompleteModule,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon" [class.deposit-icon]="!isTransfer() && transactionType() === 'deposit'"
                                      [class.withdrawal-icon]="!isTransfer() && transactionType() === 'withdrawal'"
                                      [class.transfer-icon]="isTransfer()">
          {{ isTransfer() ? 'swap_horiz' : (transactionType() === 'deposit' ? 'attach_money' : 'money_off') }}
        </mat-icon>
        <span [class.deposit-text]="!isTransfer() && transactionType() === 'deposit'"
              [class.withdrawal-text]="!isTransfer() && transactionType() === 'withdrawal'"
              [class.transfer-text]="isTransfer()">
          {{ dialogTitle() }}
        </span>
      </h2>

      <mat-dialog-content>
        <!-- Deposit / Withdrawal toggle (hidden during transfer) -->
        @if (!isTransfer()) {
          <div class="type-toggle" role="radiogroup" aria-label="Transaction type">
            <button type="button"
                    class="toggle-btn deposit"
                    [class.active]="transactionType() === 'deposit'"
                    role="radio"
                    [attr.aria-checked]="transactionType() === 'deposit'"
                    [attr.aria-label]="isCreditCard() ? 'Refund' : 'Deposit'"
                    (click)="transactionType.set('deposit')">
              <mat-icon>arrow_downward</mat-icon>
              {{ isCreditCard() ? 'Refund' : 'Deposit' }}
            </button>
            <button type="button"
                    class="toggle-btn withdrawal"
                    [class.active]="transactionType() === 'withdrawal'"
                    role="radio"
                    [attr.aria-checked]="transactionType() === 'withdrawal'"
                    [attr.aria-label]="isCreditCard() ? 'Purchase' : 'Withdrawal'"
                    (click)="transactionType.set('withdrawal')">
              <mat-icon>arrow_upward</mat-icon>
              {{ isCreditCard() ? 'Purchase' : 'Withdrawal' }}
            </button>
          </div>
        } @else {
          <div class="transfer-banner" @slideInUp>
            <mat-icon>swap_horiz</mat-icon>
            <span>Transfer to <strong>{{ transferDestinationName() }}</strong></span>
          </div>
        }

        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" id="create-transaction-form">
          <mat-form-field appearance="fill">
            <mat-label>Account</mat-label>
            <mat-select formControlName="bankAccountId">
              @for (account of dashboardState.accounts(); track account.id) {
                <mat-option [value]="account.id">
                  @switch (account.accountType) {
                    @case ('CREDIT_CARD') {
                      <mat-icon class="option-icon cc-option">credit_card</mat-icon>
                    }
                    @case ('SAVINGS') {
                      <mat-icon class="option-icon savings-option">savings</mat-icon>
                    }
                    @default {
                      <mat-icon class="option-icon">account_balance</mat-icon>
                    }
                  }
                  {{ account.name }}
                </mat-option>
              }
            </mat-select>
            @if (form.controls.bankAccountId.hasError('required') && form.controls.bankAccountId.touched) {
              <mat-error>Account is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Merchant</mat-label>
            <input matInput
                   formControlName="merchantName"
                   [matAutocomplete]="merchantAuto"
                   (input)="onMerchantInput($event)"
                   placeholder="e.g. Amazon, Walmart..."
                   autocomplete="off" />
            @if (form.controls.merchantName.value) {
              <button matSuffix mat-icon-button type="button"
                      (click)="clearMerchant()"
                      aria-label="Clear merchant">
                <mat-icon>close</mat-icon>
              </button>
            }
            <mat-autocomplete #merchantAuto="matAutocomplete"
                              (optionSelected)="onMerchantSelected($event)">
              @for (option of merchantSuggestions(); track option.id) {
                <mat-option [value]="option.label">
                  <mat-icon class="option-icon transfer-option">swap_horiz</mat-icon>
                  {{ option.label }}
                </mat-option>
              }
            </mat-autocomplete>
            @if (form.controls.merchantName.hasError('required') && form.controls.merchantName.touched) {
              <mat-error>Merchant is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Amount</mat-label>
            @if (!isTransfer()) {
              <span matTextPrefix [class.deposit-prefix]="transactionType() === 'deposit'"
                                  [class.withdrawal-prefix]="transactionType() === 'withdrawal'">
                {{ transactionType() === 'deposit' ? '+$' : '-$' }}&nbsp;
              </span>
            } @else {
              <span matTextPrefix class="transfer-prefix">$&nbsp;</span>
            }
            <input matInput type="number" formControlName="amount"
                       placeholder="0.00" step="0.01" min="0"
                       (focus)="onAmountFocus()"
                       (blur)="onAmountBlur()"
                     />
            @if (form.controls.amount.hasError('required') && form.controls.amount.touched) {
              <mat-error>Amount is required</mat-error>
            }
            @if (form.controls.amount.hasError('min') && form.controls.amount.touched) {
              <mat-error>Amount must be greater than zero</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Description (optional)</mat-label>
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

          @if (!isTransfer()) {
            <mat-form-field appearance="fill">
              <mat-label>Envelope (optional)</mat-label>
              <input matInput
                     formControlName="envelopeId"
                     [matAutocomplete]="envelopeAuto"
                     (input)="onEnvelopeInput($event)"
                     placeholder="Search envelopes..." />
              @if (form.controls.envelopeId.value) {
                <button matSuffix mat-icon-button type="button"
                        (click)="clearEnvelope()"
                        aria-label="Clear envelope">
                  <mat-icon>close</mat-icon>
                </button>
              }
              <mat-autocomplete #envelopeAuto="matAutocomplete"
                                [displayWith]="envelopeDisplayFn"
                                (optionSelected)="onEnvelopeSelected($event)">
                <mat-option value="">None</mat-option>
                @for (envelope of filteredEnvelopes(); track envelope.id) {
                  <mat-option [value]="envelope.id">{{ envelope.name }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
          }
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                type="submit" form="create-transaction-form"
                class="submit-btn"
                [class.transfer-btn]="isTransfer()"
                [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>{{ isTransfer() ? 'swap_horiz' : (transactionType() === 'deposit' ? 'arrow_downward' : 'arrow_upward') }}</mat-icon>
              {{ submitLabel() }}
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
      font-size: 28px;
      width: 28px;
      height: 28px;
      transition: color 300ms ease;
    }

    .deposit-icon { color: var(--success); }
    .withdrawal-icon { color: var(--danger); }
    .transfer-icon { color: var(--accent-primary, #818cf8); }

    .deposit-text {
      background: linear-gradient(135deg, #34d399, #6ee7b7);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }

    .withdrawal-text {
      background: linear-gradient(135deg, #f87171, #fca5a5);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }

    .transfer-text {
      background: linear-gradient(135deg, #818cf8, #a5b4fc);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }

    /* Segmented toggle */
    .type-toggle {
      display: flex;
      gap: 0;
      background: rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-lg);
      padding: 4px;
      margin-bottom: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .toggle-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      border: none;
      border-radius: calc(var(--radius-lg) - 4px);
      background: transparent;
      color: var(--text-muted, rgba(255, 255, 255, 0.45));
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
      }

      &.deposit.active {
        background: rgba(52, 211, 153, 0.15);
        color: var(--success);
        box-shadow: 0 0 20px rgba(52, 211, 153, 0.15);
      }

      &.withdrawal.active {
        background: rgba(248, 113, 113, 0.15);
        color: var(--danger);
        box-shadow: 0 0 20px rgba(248, 113, 113, 0.15);
      }

      &:not(.active):hover {
        background: rgba(255, 255, 255, 0.06);
        color: var(--text-secondary, rgba(255, 255, 255, 0.65));
      }
    }

    .deposit-prefix {
      color: var(--success);
      font-weight: 600;
    }

    .withdrawal-prefix {
      color: var(--danger);
      font-weight: 600;
    }

    .transfer-prefix {
      color: var(--accent-primary, #818cf8);
      font-weight: 600;
    }

    .transfer-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      margin-bottom: 1rem;
      border-radius: var(--radius-sm);
      background: rgba(129, 140, 248, 0.1);
      border: 1px solid rgba(129, 140, 248, 0.3);
      color: var(--accent-primary, #818cf8);
      font-size: 0.9rem;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .transfer-option {
      color: var(--accent-primary, #818cf8) !important;
    }

    .transfer-btn {
      background: linear-gradient(135deg, #818cf8, #6366f1) !important;
    }

    mat-dialog-content { padding-top: 0.5rem; }
    form { display: flex; flex-direction: column; gap: 0.25rem; }

    .option-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 8px;
      vertical-align: middle;
      color: var(--text-muted);

      &.cc-option { color: #fb923c; }
      &.savings-option { color: #4ade80; }
    }

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
  protected readonly transactionType = signal<'deposit' | 'withdrawal'>('withdrawal');
  protected readonly selectedAccountId = signal('');
  protected readonly envelopeSearchText = signal('');
  protected readonly merchantSearchText = signal('');
  protected readonly transferDestinationId = signal<string | null>(null);

  protected readonly isCreditCard = computed(() => {
    const id = this.selectedAccountId();
    if (!id) return false;
    return this.dashboardState.isCreditCard(id);
  });

  /** True when the merchant field matches a transfer suggestion. */
  protected readonly isTransfer = computed(() => !!this.transferDestinationId());

  protected readonly transferDestinationName = computed(() => {
    const id = this.transferDestinationId();
    if (!id) return '';
    const account = this.dashboardState.accounts().find(a => a.id === id);
    return account?.name ?? '';
  });

  /** Autocomplete suggestions for the merchant field — shows transfer options for other accounts. */
  protected readonly merchantSuggestions = computed(() => {
    const search = this.merchantSearchText().toLowerCase();
    const currentAccountId = this.selectedAccountId();
    return this.dashboardState.accounts()
      .filter(a => a.id !== currentAccountId)
      .map(a => ({ id: a.id!, label: `Transfer \u2192 ${a.name}` }))
      .filter(opt => !search || opt.label.toLowerCase().includes(search));
  });

  protected readonly filteredEnvelopes = computed(() => {
    const search = this.envelopeSearchText().toLowerCase();
    const envelopes = this.dashboardState.standardEnvelopes();
    if (!search) return envelopes;
    return envelopes.filter(e => e.name.toLowerCase().includes(search));
  });

  protected readonly envelopeDisplayFn = (value: string): string => {
    if (!value) return '';
    const envelope = this.dashboardState.standardEnvelopes().find(e => e.id === value);
    return envelope?.name ?? '';
  };

  protected readonly dialogTitle = computed(() => {
    if (this.isTransfer()) return 'New Transfer';
    if (this.isCreditCard()) {
      return this.transactionType() === 'deposit' ? 'CC Refund' : 'CC Purchase';
    }
    return this.transactionType() === 'deposit' ? 'New Deposit' : 'New Withdrawal';
  });

  protected readonly submitLabel = computed(() => {
    if (this.isTransfer()) return 'Transfer';
    if (this.isCreditCard()) {
      return this.transactionType() === 'deposit' ? 'Add Refund' : 'Add Purchase';
    }
    return this.transactionType() === 'deposit' ? 'Add Deposit' : 'Add Withdrawal';
  });

  private readonly glowEffect = effect(() => {
    const type = this.transactionType();
    const transfer = this.isTransfer();
    this.dialogRef.removePanelClass('withdrawal-glow-dialog');
    this.dialogRef.removePanelClass('deposit-glow-dialog');
    this.dialogRef.removePanelClass('transfer-glow-dialog');
    if (transfer) {
      this.dialogRef.addPanelClass('transfer-glow-dialog');
    } else if (type === 'deposit') {
      this.dialogRef.addPanelClass('deposit-glow-dialog');
    } else {
      this.dialogRef.addPanelClass('withdrawal-glow-dialog');
    }
  });

  protected readonly form = this.fb.nonNullable.group({
    bankAccountId: ['', Validators.required],
    merchantName: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
    transactionDate: [new Date(), Validators.required],
    envelopeId: [''],
  });

  constructor() {
    this.form.controls.bankAccountId.valueChanges.subscribe(id => {
      this.selectedAccountId.set(id);
      // If account changed and we had a transfer destination that matches the new account, clear it
      if (this.transferDestinationId() === id) {
        this.clearMerchant();
      }
    });
  }

  onAmountFocus(): void {
    const ctrl = this.form.controls.amount;
    if (ctrl.value === 0) {
      ctrl.setValue(null as unknown as number);
    }
  }

  onAmountBlur(): void {
    const ctrl = this.form.controls.amount;
    if (ctrl.value === null) {
      ctrl.setValue(0);
    }
  }

  onMerchantInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.merchantSearchText.set(value);
    // If the user edits the text and it no longer matches a transfer, clear the transfer state
    const match = this.dashboardState.accounts().find(a =>
      `Transfer \u2192 ${a.name}` === value && a.id !== this.selectedAccountId()
    );
    this.transferDestinationId.set(match?.id ?? null);
  }

  onMerchantSelected(event: { option: { value: string } }): void {
    const label = event.option.value;
    this.merchantSearchText.set('');
    // Find the account that matches this transfer label
    const match = this.dashboardState.accounts().find(a =>
      `Transfer \u2192 ${a.name}` === label && a.id !== this.selectedAccountId()
    );
    if (match) {
      this.transferDestinationId.set(match.id!);
      // Clear envelope since transfers don't use envelopes
      this.form.controls.envelopeId.setValue('');
    } else {
      this.transferDestinationId.set(null);
    }
  }

  clearMerchant(): void {
    this.form.controls.merchantName.setValue('');
    this.merchantSearchText.set('');
    this.transferDestinationId.set(null);
  }

  onEnvelopeInput(event: Event): void {
    this.envelopeSearchText.set((event.target as HTMLInputElement).value);
  }

  onEnvelopeSelected(event: { option: { value: string } }): void {
    this.envelopeSearchText.set('');
  }

  clearEnvelope(): void {
    this.form.controls.envelopeId.setValue('');
    this.envelopeSearchText.set('');
  }

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
    const formattedDate = `${year}-${month}-${day}`;

    if (this.isTransfer()) {
      // Transfer flow
      const transferReq: TransferRequest = {
        sourceAccountId: raw.bankAccountId,
        destinationAccountId: this.transferDestinationId()!,
        amount: Math.abs(raw.amount),
        merchantName: raw.merchantName || undefined,
        description: raw.description || undefined,
        transactionDate: formattedDate,
      };

      this.transactionApi.createTransfer(transferReq).subscribe({
        next: (created) => {
          this.loading.set(false);
          // Close with both transactions so the parent can do optimistic updates
          this.dialogRef.close({ transfer: true, transactions: created });
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create transfer. Please try again.'
          );
        },
      });
    } else {
      // Regular transaction flow
      const signedAmount = this.transactionType() === 'withdrawal'
        ? -Math.abs(raw.amount)
        : Math.abs(raw.amount);

      const dto: TransactionDTO = {
        bankAccountId: raw.bankAccountId,
        amount: signedAmount,
        merchantName: raw.merchantName || undefined,
        description: raw.description || undefined,
        transactionDate: formattedDate,
        envelopeId: raw.envelopeId || undefined,
      };

      this.transactionApi.createTransaction(dto).subscribe({
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
}
