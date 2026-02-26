import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { BankAccountControllerService } from '../../core/api/api/bankAccountController.service';
import { EnvelopeControllerService } from '../../core/api/api/envelopeController.service';
import { BankAccountDTO } from '../../core/api/model/bankAccountDTO';
import { EnvelopeDTO } from '../../core/api/model/envelopeDTO';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  private readonly bankAccountApi = inject(BankAccountControllerService);
  private readonly envelopeApi = inject(EnvelopeControllerService);
  private readonly authService = inject(AuthService);

  readonly accounts = signal<BankAccountDTO[]>([]);
  readonly envelopes = signal<EnvelopeDTO[]>([]);
  readonly loading = signal(true);

  readonly totalBankBalance = computed(() =>
    this.accounts().reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)
  );

  readonly totalEnvelopeAllocation = computed(() =>
    this.envelopes().reduce((sum, e) => sum + (e.allocatedBalance ?? 0), 0)
  );

  readonly unallocatedAmount = computed(() =>
    Math.max(0, this.totalBankBalance() - this.totalEnvelopeAllocation())
  );

  readonly accountCount = computed(() => this.accounts().length);
  readonly envelopeCount = computed(() => this.envelopes().length);

  loadAll(): void {
    // Don't fire requests if there's no auth token yet
    if (!this.authService.getAccessToken()) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    forkJoin({
      accounts: this.bankAccountApi.getBankAccounts(),
      envelopes: this.envelopeApi.getEnvelopes(),
    }).subscribe({
      next: ({ accounts, envelopes }) => {
        this.accounts.set(accounts);
        this.envelopes.set(envelopes);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.loadAll();
  }

  addAccount(account: BankAccountDTO): void {
    this.accounts.update(current => [...current, account]);
  }

  removeAccount(id: string): void {
    this.accounts.update(current => current.filter(a => a.id !== id));
  }
}
