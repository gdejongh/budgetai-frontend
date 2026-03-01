import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { BankAccountControllerService } from '../../core/api/api/bankAccountController.service';
import { EnvelopeCategoryControllerService } from '../../core/api/api/envelopeCategoryController.service';
import { EnvelopeControllerService } from '../../core/api/api/envelopeController.service';
import { TransactionControllerService } from '../../core/api/api/transactionController.service';
import { BankAccountDTO } from '../../core/api/model/bankAccountDTO';
import { EnvelopeAllocationDTO } from '../../core/api/model/envelopeAllocationDTO';
import { EnvelopeCategoryDTO } from '../../core/api/model/envelopeCategoryDTO';
import { EnvelopeDTO } from '../../core/api/model/envelopeDTO';
import { EnvelopeSpentSummaryDTO } from '../../core/api/model/envelopeSpentSummaryDTO';
import { TransactionDTO } from '../../core/api/model/transactionDTO';

@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  private readonly bankAccountApi = inject(BankAccountControllerService);
  private readonly envelopeCategoryApi = inject(EnvelopeCategoryControllerService);
  private readonly envelopeApi = inject(EnvelopeControllerService);
  private readonly transactionApi = inject(TransactionControllerService);
  private readonly authService = inject(AuthService);

  readonly accounts = signal<BankAccountDTO[]>([]);
  readonly envelopeCategories = signal<EnvelopeCategoryDTO[]>([]);
  readonly envelopes = signal<EnvelopeDTO[]>([]);
  readonly transactions = signal<TransactionDTO[]>([]);
  readonly spentSummaries = signal<EnvelopeSpentSummaryDTO[]>([]);
  readonly monthlyAllocations = signal<EnvelopeAllocationDTO[]>([]);

  /** The currently viewed month, as 'YYYY-MM-DD' (first of month). */
  readonly viewedMonth = signal(this.getCurrentMonthStr());
  readonly loading = signal(true);

  readonly envelopesByCategory = computed(() => {
    const map = new Map<string, EnvelopeDTO[]>();
    for (const envelope of this.envelopes()) {
      const catId = envelope.envelopeCategoryId;
      if (!map.has(catId)) {
        map.set(catId, []);
      }
      map.get(catId)!.push(envelope);
    }
    return map;
  });

  readonly spentDateRange = computed(() => {
    const monthStr = this.viewedMonth();
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = monthStr;
    // Last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  });

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
      accounts: this.bankAccountApi.getBankAccounts().pipe(
        catchError(err => { console.error('Failed to load accounts:', err); return of([] as BankAccountDTO[]); })
      ),
      envelopeCategories: this.envelopeCategoryApi.getEnvelopeCategories().pipe(
        catchError(err => { console.error('Failed to load envelope categories:', err); return of([] as EnvelopeCategoryDTO[]); })
      ),
      envelopes: this.envelopeApi.getEnvelopes().pipe(
        catchError(err => { console.error('Failed to load envelopes:', err); return of([] as EnvelopeDTO[]); })
      ),
      transactions: this.transactionApi.getAllTransactions().pipe(
        catchError(err => { console.error('Failed to load transactions:', err); return of([] as TransactionDTO[]); })
      ),
      monthlyAllocations: this.envelopeApi.getMonthlyAllocations(this.viewedMonth()).pipe(
        catchError(err => { console.error('Failed to load monthly allocations:', err); return of([] as EnvelopeAllocationDTO[]); })
      ),
    }).subscribe({
      next: ({ accounts, envelopeCategories, envelopes, transactions, monthlyAllocations }) => {
        this.accounts.set(accounts);
        this.envelopeCategories.set(envelopeCategories);
        this.envelopes.set(envelopes);
        this.transactions.set(transactions);
        this.monthlyAllocations.set(monthlyAllocations);
        this.loading.set(false);
        this.loadSpentSummaries();
      },
      error: (err) => {
        console.error('Dashboard loadAll failed:', err);
        this.loading.set(false);
      },
    });
  }

  loadSpentSummaries(): void {
    const { startDate, endDate } = this.spentDateRange();
    this.envelopeApi.getEnvelopeSpentSummary(startDate, endDate).pipe(
      catchError(err => { console.error('Failed to load spent summaries:', err); return of([] as EnvelopeSpentSummaryDTO[]); })
    ).subscribe(summaries => this.spentSummaries.set(summaries));
  }

  refresh(): void {
    this.loadAll();
  }

  /**
   * Navigate to a specific month and reload monthly allocations + spent summaries.
   */
  loadMonthData(month: string): void {
    this.viewedMonth.set(month);
    forkJoin({
      monthlyAllocations: this.envelopeApi.getMonthlyAllocations(month).pipe(
        catchError(err => { console.error('Failed to load monthly allocations:', err); return of([] as EnvelopeAllocationDTO[]); })
      ),
    }).subscribe(({ monthlyAllocations }) => {
      this.monthlyAllocations.set(monthlyAllocations);
      this.loadSpentSummaries();
    });
  }

  /**
   * Reload only the envelopes list (to pick up updated allocatedBalance totals).
   */
  loadEnvelopes(): void {
    this.envelopeApi.getEnvelopes().pipe(
      catchError(err => { console.error('Failed to load envelopes:', err); return of([] as EnvelopeDTO[]); })
    ).subscribe(envelopes => this.envelopes.set(envelopes));
  }

  loadTransactions(): void {
    this.transactionApi.getAllTransactions().subscribe({
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

  updateAccount(id: string, updated: BankAccountDTO): void {
    this.accounts.update(current =>
      current.map(a => (a.id === id ? updated : a))
    );
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

  addCategory(category: EnvelopeCategoryDTO): void {
    this.envelopeCategories.update(current => [...current, category]);
  }

  removeCategory(id: string): void {
    this.envelopeCategories.update(current => current.filter(c => c.id !== id));
    this.envelopes.update(current => current.filter(e => e.envelopeCategoryId !== id));
  }

  updateCategory(id: string, updated: EnvelopeCategoryDTO): void {
    this.envelopeCategories.update(current =>
      current.map(c => (c.id === id ? updated : c))
    );
  }

  addTransaction(transaction: TransactionDTO): void {
    this.transactions.update(current => [transaction, ...current]);
    this.adjustAccountBalance(transaction.bankAccountId, transaction.amount);
    this.loadSpentSummaries();
  }

  removeTransaction(id: string): void {
    const transaction = this.transactions().find(t => t.id === id);
    this.transactions.update(current => current.filter(t => t.id !== id));
    if (transaction) {
      this.adjustAccountBalance(transaction.bankAccountId, -transaction.amount);
    }
    this.loadSpentSummaries();
  }

  updateTransaction(id: string, oldTxn: TransactionDTO, newTxn: TransactionDTO): void {
    this.transactions.update(current =>
      current.map(t => (t.id === id ? newTxn : t))
    );

    const oldAccountId = oldTxn.bankAccountId;
    const newAccountId = newTxn.bankAccountId;
    const oldAmount = oldTxn.amount;
    const newAmount = newTxn.amount;
    const amountDiff = newAmount - oldAmount;

    // --- Bank Account balance adjustments ---
    if (oldAccountId !== newAccountId) {
      this.adjustAccountBalance(oldAccountId, -oldAmount);
      this.adjustAccountBalance(newAccountId, newAmount);
    } else if (amountDiff !== 0) {
      this.adjustAccountBalance(oldAccountId, amountDiff);
    }

    this.loadSpentSummaries();
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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentMonthStr(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  /**
   * Remove all transactions for a given bank account ID.
   */
  removeTransactionsForAccount(accountId: string): void {
    this.transactions.update(current => current.filter(t => t.bankAccountId !== accountId));
  }

  /**
   * Update the monthly allocation for an envelope in the local signal.
   */
  updateMonthlyAllocation(envelopeId: string, amount: number): void {
    this.monthlyAllocations.update(current => {
      const existing = current.find(a => a.envelopeId === envelopeId);
      if (existing) {
        return current.map(a => a.envelopeId === envelopeId ? { ...a, amount } : a);
      }
      return [...current, { envelopeId, yearMonth: this.viewedMonth(), amount }];
    });
  }
}
