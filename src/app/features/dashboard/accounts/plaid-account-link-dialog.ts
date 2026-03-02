import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { LowerCasePipe } from '@angular/common';

import { PlaidService } from '../../../core/services/plaid.service';
import {
  PlaidLinkAccount,
  ExchangeTokenRequest,
  PlaidAccountLink,
} from '../../../core/services/plaid.types';
import { BankAccountDTO } from '../../../core/api/model/bankAccountDTO';
import { DashboardStateService } from '../dashboard-state.service';
import { fadeIn, slideInUp } from '../../../shared/animations/route-animations';

export interface PlaidAccountLinkDialogData {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  plaidAccounts: PlaidLinkAccount[];
}

@Component({
  selector: 'app-plaid-account-link-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    LowerCasePipe,
  ],
  animations: [fadeIn, slideInUp],
  template: `
    <div class="dialog-container" @fadeIn>
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">link</mat-icon>
        <span class="gradient-text">Link Accounts</span>
      </h2>
      <p class="institution-subtitle">
        <mat-icon class="institution-icon">account_balance</mat-icon>
        {{ data.institutionName }}
      </p>

      <mat-dialog-content>
        @if (errorMessage()) {
          <div class="error-banner" @slideInUp role="alert">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <p class="helper-text">
          Choose how to connect each account. You can link to an existing account or
          create a new one.
        </p>

        <div class="account-list">
          @for (plaidAccount of data.plaidAccounts; track plaidAccount.id; let i = $index) {
            <div class="account-row glass-card" @slideInUp>
              <div class="account-info">
                <mat-icon class="account-icon">
                  {{ plaidAccount.type === 'credit' ? 'credit_card' : 'account_balance' }}
                </mat-icon>
                <div>
                  <span class="account-name">{{ plaidAccount.name }}</span>
                  <span class="account-detail">
                    {{ formatAccountType(plaidAccount.type, plaidAccount.subtype) }}
                    @if (plaidAccount.mask) {
                      &bull; ••{{ plaidAccount.mask }}
                    }
                  </span>
                </div>
              </div>

              <div class="link-options">
                <mat-radio-group [value]="linkModes()[i]"
                                 (change)="setLinkMode(i, $event.value)"
                                 [attr.aria-label]="'Link option for ' + plaidAccount.name">
                  <mat-radio-button value="new">
                    Create new account
                  </mat-radio-button>
                  @if (compatibleAccounts(plaidAccount).length > 0) {
                    <mat-radio-button value="existing">
                      Link to existing
                    </mat-radio-button>
                  }
                </mat-radio-group>

                @if (linkModes()[i] === 'existing') {
                  <mat-form-field appearance="fill" class="existing-select">
                    <mat-label>Select account</mat-label>
                    <mat-select [value]="selectedAccountIds()[i]"
                                (selectionChange)="setSelectedAccount(i, $event.value)">
                      @for (acct of compatibleAccounts(plaidAccount); track acct.id) {
                        <mat-option [value]="acct.id">
                          {{ acct.name }}
                          @if (acct.accountType) {
                            ({{ acct.accountType | lowercase }})
                          }
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                }
              </div>
            </div>
          }
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close [disabled]="loading()">Cancel</button>
        <button mat-flat-button color="primary"
                class="submit-btn"
                [disabled]="loading() || !isValid()"
                (click)="onSubmit()">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container>
              <mat-icon>link</mat-icon>
              Connect {{ data.plaidAccounts.length === 1 ? 'Account' : 'Accounts' }}
            </ng-container>
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container {
      min-width: 440px;
      max-width: 560px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0;
      margin-bottom: 0;
    }

    .title-icon {
      color: var(--accent-primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .institution-subtitle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin: 0.25rem 0 0 0;
      padding-left: 24px;
    }

    .institution-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .helper-text {
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 1rem;
    }

    .account-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .account-row {
      padding: 1rem 1.25rem;
    }

    .account-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;

      .account-icon {
        color: var(--accent-primary);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .account-name {
        display: block;
        font-weight: 600;
        font-size: 0.95rem;
      }

      .account-detail {
        display: block;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
    }

    .link-options {
      padding-left: 2.25rem;

      mat-radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      mat-radio-button {
        font-size: 0.875rem;
      }
    }

    .existing-select {
      margin-top: 0.5rem;
      width: 100%;
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

      mat-spinner {
        display: inline-block;
      }
    }
  `,
})
export class PlaidAccountLinkDialog {
  protected readonly data = inject<PlaidAccountLinkDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PlaidAccountLinkDialog>);
  private readonly plaidService = inject(PlaidService);
  private readonly dashboardState = inject(DashboardStateService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  // Per-account state: 'new' or 'existing'
  protected readonly linkModes = signal<string[]>(
    this.data.plaidAccounts.map(() => 'new')
  );

  // Per-account: selected existing account ID (when mode is 'existing')
  protected readonly selectedAccountIds = signal<(string | null)[]>(
    this.data.plaidAccounts.map(() => null)
  );

  setLinkMode(index: number, mode: string): void {
    this.linkModes.update(modes => {
      const copy = [...modes];
      copy[index] = mode;
      return copy;
    });
    // Clear selected account when switching to 'new'
    if (mode === 'new') {
      this.selectedAccountIds.update(ids => {
        const copy = [...ids];
        copy[index] = null;
        return copy;
      });
    }
  }

  setSelectedAccount(index: number, accountId: string): void {
    this.selectedAccountIds.update(ids => {
      const copy = [...ids];
      copy[index] = accountId;
      return copy;
    });
  }

  /**
   * Returns existing accounts that are compatible with a Plaid account
   * (matching type: credit → CREDIT_CARD, depository → CHECKING/SAVINGS).
   */
  compatibleAccounts(plaidAccount: PlaidLinkAccount): BankAccountDTO[] {
    const allAccounts = this.dashboardState.accounts();
    if (plaidAccount.type === 'credit') {
      return allAccounts.filter(a => a.accountType === 'CREDIT_CARD');
    }
    // depository accounts
    return allAccounts.filter(
      a => a.accountType === 'CHECKING' || a.accountType === 'SAVINGS'
    );
  }

  formatAccountType(type: string, subtype: string): string {
    if (type === 'credit') return 'Credit Card';
    if (subtype === 'savings') return 'Savings';
    if (subtype === 'checking') return 'Checking';
    return subtype || type;
  }

  isValid(): boolean {
    const modes = this.linkModes();
    const selectedIds = this.selectedAccountIds();
    return modes.every((mode, i) => {
      if (mode === 'new') return true;
      return selectedIds[i] != null;
    });
  }

  onSubmit(): void {
    if (!this.isValid()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const accountLinks: PlaidAccountLink[] = this.data.plaidAccounts.map((pa, i) => {
      const link: PlaidAccountLink = {
        plaidAccountId: pa.id,
        accountName: pa.name,
        accountType: this.mapPlaidType(pa.type, pa.subtype),
        mask: pa.mask,
      };
      if (this.linkModes()[i] === 'existing' && this.selectedAccountIds()[i]) {
        link.existingBankAccountId = this.selectedAccountIds()[i]!;
      }
      return link;
    });

    const request: ExchangeTokenRequest = {
      publicToken: this.data.publicToken,
      institutionId: this.data.institutionId,
      institutionName: this.data.institutionName,
      accountLinks,
    };

    this.plaidService.exchangeToken(request).subscribe({
      next: () => {
        this.loading.set(false);
        this.dashboardState.refresh();
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Failed to connect accounts. Please try again.'
        );
      },
    });
  }

  private mapPlaidType(type: string, subtype: string): string {
    if (type === 'credit') return 'CREDIT_CARD';
    if (subtype === 'savings') return 'SAVINGS';
    return 'CHECKING';
  }
}
