import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { BankAccountControllerService } from '../../core/api/api/bankAccountController.service';
import { EnvelopeControllerService } from '../../core/api/api/envelopeController.service';
import { BankAccountDTO } from '../../core/api/model/bankAccountDTO';
import { EnvelopeDTO } from '../../core/api/model/envelopeDTO';
import { TransactionDTO } from '../../core/api/model/transactionDTO';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  private readonly http = inject(HttpClient);
  private readonly bankAccountApi = inject(BankAccountControllerService);
  private readonly envelopeApi = inject(EnvelopeControllerService);
  private readonly authService = inject(AuthService);

  readonly accounts = signal<BankAccountDTO[]>([]);
  readonly envelopes = signal<EnvelopeDTO[]>([]);
  readonly transactions = signal<TransactionDTO[]>([]);
  readonly loading = signal(true);

  readonly totalBankBalance = computed(() =>
    this.accounts().reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)
  );

  readonly totalEnvelopeAllocation = computed(() =>
    this.envelopes().reduce((sum, e) => sum + (e.allocatedBalance ?? 0), 0)
  );

  readonly unallocatedAmount = computed(() =>
    this.totalBankBalance() - this.totalEnvelopeAllocation()
  );

  readonly accountCount = computed(() => this.accounts().length);
  readonly envelopeCount = computed(() => this.envelopes().length);
  readonly transactionCount = computed(() => this.transactions().length);

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
      transactions: this.http.get<TransactionDTO[]>('http://localhost:8080/api/transactions'),
    }).subscribe({
      next: ({ accounts, envelopes, transactions }) => {
        this.accounts.set(accounts);
        this.envelopes.set(envelopes);
        this.transactions.set(transactions);
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

  loadTransactions(): void {
    this.http.get<TransactionDTO[]>('http://localhost:8080/api/transactions').subscribe({
      next: (transactions) => this.transactions.set(transactions),
      error: () => {},
    });
  }

  addAccount(account: BankAccountDTO): void {
    this.accounts.update(current => [...current, account]);
  }

  removeAccount(id: string): void {
    this.accounts.update(current => current.filter(a => a.id !== id));
  }

  addEnvelope(envelope: EnvelopeDTO): void {
    this.envelopes.update(current => [...current, envelope]);
  }

  removeEnvelope(id: string): void {
    this.envelopes.update(current => current.filter(e => e.id !== id));
  }

  updateEnvelope(id: string, updated: EnvelopeDTO): void {
    this.envelopes.update(current =>
      current.map(e => (e.id === id ? updated : e))
    );
  }

  addTransaction(transaction: TransactionDTO): void {
    this.transactions.update(current => [transaction, ...current]);
    this.adjustAccountBalance(transaction.bankAccountId, transaction.amount);
  }

  removeTransaction(id: string): void {
    const transaction = this.transactions().find(t => t.id === id);
    this.transactions.update(current => current.filter(t => t.id !== id));
    if (transaction) {
      this.adjustAccountBalance(transaction.bankAccountId, -transaction.amount);
    }
  }

  private adjustAccountBalance(accountId: string, amount: number): void {
    this.accounts.update(current =>
      current.map(a =>
        a.id === accountId
          ? { ...a, currentBalance: (a.currentBalance ?? 0) + amount }
          : a
      )
    );
  }

  /**
   * Remove all transactions for a given bank account ID.
   */
  removeTransactionsForAccount(accountId: string): void {
    this.transactions.update(current => current.filter(t => t.bankAccountId !== accountId));
  }
}
