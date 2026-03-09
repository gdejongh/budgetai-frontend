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
import { CCPaymentRequest } from '../../core/api/model/ccPaymentRequest';
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

  /** Only checking & savings accounts (non-credit-card). */
  readonly bankAccounts = computed(() =>
    this.accounts().filter(a => a.accountType !== 'CREDIT_CARD')
  );

  /** Only credit card accounts. */
  readonly creditCards = computed(() =>
    this.accounts().filter(a => a.accountType === 'CREDIT_CARD')
  );

  /** The currently viewed month, as 'YYYY-MM-DD' (first of month). */
  readonly viewedMonth = signal(this.getCurrentMonthStr());
  readonly loading = signal(true);

  /** Non-null when loadAll() partially or fully failed. */
  readonly loadError = signal<string | null>(null);

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

  readonly totalBankBalance = computed(() => {
    const bankSum = this.bankAccounts().reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
    const ccDebt = this.creditCards().reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
    return bankSum - ccDebt;
  });

  readonly totalEnvelopeAllocation = computed(() =>
    this.envelopes().reduce((sum, e) => sum + (e.allocatedBalance ?? 0), 0)
  );

  /**
   * Sum of all transaction amounts that are assigned to an envelope.
   * Withdrawals are negative, so this value is typically <= 0.
   */
  readonly totalAllTimeEnvelopeSpent = computed(() =>
    this.transactions()
      .filter(t => !!t.envelopeId)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  readonly unallocatedAmount = computed(() => {
    // Use cash-only balance (checking + savings) — not net worth (which subtracts CC debt).
    // CC debt coverage is already represented by the CC Payment envelope allocations
    // included in totalEnvelopeAllocation, so subtracting CC debt here would double-count.
    const totalCash = this.bankAccounts().reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
    const raw = totalCash - this.totalEnvelopeAllocation() - this.totalAllTimeEnvelopeSpent();
    // Round to cents to avoid floating-point artifacts that cause incorrect styling
    return Math.round(raw * 100) / 100;
  });

  readonly accountCount = computed(() => this.accounts().length);
  readonly envelopeCount = computed(() => this.envelopes().length);
  readonly transactionCount = computed(() => this.transactions().length);

  /** Envelope categories sorted with CC_PAYMENT always first. */
  readonly sortedEnvelopeCategories = computed(() => {
    const cats = this.envelopeCategories();
    return [...cats].sort((a, b) => {
      if (a.categoryType === 'CC_PAYMENT' && b.categoryType !== 'CC_PAYMENT') return -1;
      if (a.categoryType !== 'CC_PAYMENT' && b.categoryType === 'CC_PAYMENT') return 1;
      return 0;
    });
  });

  /** Map of CC account ID → its linked CC Payment envelope. */
  readonly ccPaymentEnvelopes = computed(() => {
    const map = new Map<string, EnvelopeDTO>();
    for (const env of this.envelopes()) {
      if (env.envelopeType === 'CC_PAYMENT' && env.linkedAccountId) {
        map.set(env.linkedAccountId, env);
      }
    }
    return map;
  });

  /**
   * Map of CC account ID → uncovered debt amount.
   * Uncovered debt = total CC debt − effective CC Payment envelope funding.
   * Effective funding accounts for overspent source envelopes (YNAB model).
   * A positive number means debt that hasn't been "covered" by envelope spending.
   */
  readonly uncoveredDebtByCard = computed(() => {
    const map = new Map<string, number>();
    const ccAccountIds = new Set(this.creditCards().map(c => c.id!));
    const allEnvelopes = this.envelopes();
    const ccPaymentEnvelopeIds = new Set(
      allEnvelopes.filter(e => e.envelopeType === 'CC_PAYMENT').map(e => e.id!)
    );
    const txns = this.transactions();

    for (const cc of this.creditCards()) {
      const debt = cc.currentBalance ?? 0;
      const ccEnv = this.ccPaymentEnvelopes().get(cc.id!);
      const rawAllocated = ccEnv?.allocatedBalance ?? 0;

      // Compute shortfall from overspent source envelopes
      let shortfall = 0;
      if (ccEnv && txns.length > 0) {
        const totalCCSpendPerEnv: Record<string, number> = {};
        const thisCardSpendPerEnv: Record<string, number> = {};

        for (const txn of txns) {
          if (!txn.bankAccountId || !txn.envelopeId) continue;
          if (!ccAccountIds.has(txn.bankAccountId)) continue;
          if (txn.amount >= 0) continue;
          if (ccPaymentEnvelopeIds.has(txn.envelopeId)) continue;

          const absAmt = Math.abs(txn.amount);
          totalCCSpendPerEnv[txn.envelopeId] = (totalCCSpendPerEnv[txn.envelopeId] ?? 0) + absAmt;
          if (txn.bankAccountId === cc.id) {
            thisCardSpendPerEnv[txn.envelopeId] = (thisCardSpendPerEnv[txn.envelopeId] ?? 0) + absAmt;
          }
        }

        for (const [envId, thisCardSpend] of Object.entries(thisCardSpendPerEnv)) {
          if (thisCardSpend <= 0) continue;
          const sourceEnv = allEnvelopes.find(e => e.id === envId);
          if (!sourceEnv) continue;
          const allCCSpend = totalCCSpendPerEnv[envId] ?? thisCardSpend;
          const envShortfall = Math.max(0, allCCSpend - (sourceEnv.allocatedBalance ?? 0));
          if (envShortfall <= 0) continue;
          shortfall += envShortfall * (thisCardSpend / allCCSpend);
        }
      }

      const effective = rawAllocated - shortfall;
      const uncovered = debt - effective;
      if (uncovered > 0) {
        map.set(cc.id!, uncovered);
      }
    }
    return map;
  });

  /** Only user-created (non-CC-Payment) envelopes, for allocation totals. */
  readonly standardEnvelopes = computed(() =>
    this.envelopes().filter(e => e.envelopeType !== 'CC_PAYMENT')
  );

  /** Only user-created (non-CC-Payment) categories. */
  readonly standardCategories = computed(() =>
    this.envelopeCategories().filter(c => c.categoryType !== 'CC_PAYMENT')
  );

  loadAll(): void {
    // Don't fire requests if there's no auth token yet
    if (!this.authService.getAccessToken()) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    const failures: string[] = [];

    forkJoin({
      accounts: this.bankAccountApi.getBankAccounts().pipe(
        catchError(err => { console.error('Failed to load accounts:', err); failures.push('accounts'); return of([] as BankAccountDTO[]); })
      ),
      envelopeCategories: this.envelopeCategoryApi.getEnvelopeCategories().pipe(
        catchError(err => { console.error('Failed to load envelope categories:', err); failures.push('categories'); return of([] as EnvelopeCategoryDTO[]); })
      ),
      envelopes: this.envelopeApi.getEnvelopes().pipe(
        catchError(err => { console.error('Failed to load envelopes:', err); failures.push('envelopes'); return of([] as EnvelopeDTO[]); })
      ),
      transactions: this.transactionApi.getAllTransactions().pipe(
        catchError(err => { console.error('Failed to load transactions:', err); failures.push('transactions'); return of([] as TransactionDTO[]); })
      ),
      monthlyAllocations: this.envelopeApi.getMonthlyAllocations(this.viewedMonth()).pipe(
        catchError(err => { console.error('Failed to load monthly allocations:', err); failures.push('allocations'); return of([] as EnvelopeAllocationDTO[]); })
      ),
    }).subscribe({
      next: ({ accounts, envelopeCategories, envelopes, transactions, monthlyAllocations }) => {
        this.accounts.set(accounts);
        this.envelopeCategories.set(envelopeCategories);
        this.envelopes.set(envelopes);
        this.transactions.set(transactions);
        this.monthlyAllocations.set(monthlyAllocations);
        this.loading.set(false);
        if (failures.length > 0) {
          this.loadError.set(`Failed to load: ${failures.join(', ')}. Some data may be missing.`);
        }
        this.loadSpentSummaries();
      },
      error: (err) => {
        console.error('Dashboard loadAll failed:', err);
        this.loading.set(false);
        this.loadError.set('Failed to load dashboard data. Please try again.');
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
      error: (err) => {
        console.error('Failed to reload transactions:', err);
        this.loadError.set('Failed to reload transactions.');
      },
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
    const account = this.accounts().find(a => a.id === transaction.bankAccountId);
    const isCreditCard = account?.accountType === 'CREDIT_CARD';
    // CC balance inversion: a purchase (negative amount) increases CC debt (positive balance)
    const balanceChange = isCreditCard ? -transaction.amount : transaction.amount;
    this.adjustAccountBalance(transaction.bankAccountId, balanceChange);

    // Optimistic CC Payment envelope auto-move
    if (isCreditCard && transaction.envelopeId) {
      const ccPaymentEnv = this.ccPaymentEnvelopes().get(transaction.bankAccountId);
      if (ccPaymentEnv?.id) {
        if (transaction.amount < 0) {
          // CC purchase: increase CC Payment envelope allocation by |amount|
          this.adjustEnvelopeAllocation(ccPaymentEnv.id, Math.abs(transaction.amount));
        } else if (transaction.amount > 0) {
          // CC refund: decrease CC Payment envelope allocation
          this.adjustEnvelopeAllocation(ccPaymentEnv.id, -transaction.amount);
        }
      }
    }

    this.loadSpentSummaries();
  }

  removeTransaction(id: string): void {
    const transaction = this.transactions().find(t => t.id === id);
    if (transaction) {
      // If this is a CC_PAYMENT or TRANSFER, also remove the linked transaction
      if ((transaction.transactionType === 'CC_PAYMENT' || transaction.transactionType === 'TRANSFER')
          && transaction.linkedTransactionId) {
        const linked = this.transactions().find(t => t.id === transaction.linkedTransactionId);
        this.transactions.update(current =>
          current.filter(t => t.id !== id && t.id !== transaction.linkedTransactionId)
        );
        // Revert both balances
        const account = this.accounts().find(a => a.id === transaction.bankAccountId);
        const isCreditCard = account?.accountType === 'CREDIT_CARD';
        this.adjustAccountBalance(transaction.bankAccountId, isCreditCard ? transaction.amount : -transaction.amount);
        if (linked) {
          const linkedAccount = this.accounts().find(a => a.id === linked.bankAccountId);
          const linkedIsCreditCard = linkedAccount?.accountType === 'CREDIT_CARD';
          this.adjustAccountBalance(linked.bankAccountId, linkedIsCreditCard ? linked.amount : -linked.amount);
        }
      } else {
        this.transactions.update(current => current.filter(t => t.id !== id));
        const account = this.accounts().find(a => a.id === transaction.bankAccountId);
        const isCreditCard = account?.accountType === 'CREDIT_CARD';
        this.adjustAccountBalance(transaction.bankAccountId, isCreditCard ? transaction.amount : -transaction.amount);

        // Reverse optimistic CC Payment envelope auto-move
        if (isCreditCard && transaction.envelopeId && transaction.transactionType !== 'CC_PAYMENT') {
          const ccPaymentEnv = this.ccPaymentEnvelopes().get(transaction.bankAccountId);
          if (ccPaymentEnv?.id) {
            if (transaction.amount < 0) {
              // Deleting a CC purchase: decrease CC Payment envelope allocation
              this.adjustEnvelopeAllocation(ccPaymentEnv.id, -Math.abs(transaction.amount));
            } else if (transaction.amount > 0) {
              // Deleting a CC refund: increase CC Payment envelope allocation
              this.adjustEnvelopeAllocation(ccPaymentEnv.id, transaction.amount);
            }
          }
        }
      }
    } else {
      this.transactions.update(current => current.filter(t => t.id !== id));
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

    const oldAccount = this.accounts().find(a => a.id === oldAccountId);
    const newAccount = this.accounts().find(a => a.id === newAccountId);
    const oldIsCreditCard = oldAccount?.accountType === 'CREDIT_CARD';
    const newIsCreditCard = newAccount?.accountType === 'CREDIT_CARD';

    // --- Bank Account balance adjustments ---
    if (oldAccountId !== newAccountId) {
      this.adjustAccountBalance(oldAccountId, oldIsCreditCard ? oldAmount : -oldAmount);
      this.adjustAccountBalance(newAccountId, newIsCreditCard ? -newAmount : newAmount);
    } else {
      const amountDiff = newAmount - oldAmount;
      if (amountDiff !== 0) {
        this.adjustAccountBalance(oldAccountId, oldIsCreditCard ? -amountDiff : amountDiff);
      }
    }

    // --- CC Payment envelope auto-move adjustments on update ---
    // Reverse old auto-move for CC purchases
    if (oldIsCreditCard && oldTxn.envelopeId && oldAmount < 0) {
      const ccPaymentEnv = this.ccPaymentEnvelopes().get(oldAccountId);
      if (ccPaymentEnv?.id) {
        this.adjustEnvelopeAllocation(ccPaymentEnv.id, -Math.abs(oldAmount));
      }
    }
    // Reverse old refund-move
    if (oldIsCreditCard && oldTxn.envelopeId && oldAmount > 0) {
      const ccPaymentEnv = this.ccPaymentEnvelopes().get(oldAccountId);
      if (ccPaymentEnv?.id) {
        this.adjustEnvelopeAllocation(ccPaymentEnv.id, oldAmount);
      }
    }
    // Apply new auto-move for CC purchases
    if (newIsCreditCard && newTxn.envelopeId && newAmount < 0) {
      const ccPaymentEnv = this.ccPaymentEnvelopes().get(newAccountId);
      if (ccPaymentEnv?.id) {
        this.adjustEnvelopeAllocation(ccPaymentEnv.id, Math.abs(newAmount));
      }
    }
    // Apply new refund-move
    if (newIsCreditCard && newTxn.envelopeId && newAmount > 0) {
      const ccPaymentEnv = this.ccPaymentEnvelopes().get(newAccountId);
      if (ccPaymentEnv?.id) {
        this.adjustEnvelopeAllocation(ccPaymentEnv.id, -newAmount);
      }
    }

    this.loadSpentSummaries();
  }

  /**
   * Optimistically update state after a CC payment.
   * Adds both the bank-side and CC-side transactions, adjusts both balances,
   * and decreases the CC Payment envelope allocation.
   */
  addCCPayment(bankTransaction: TransactionDTO, ccTransaction: TransactionDTO): void {
    this.transactions.update(current => [bankTransaction, ccTransaction, ...current]);
    // Bank side: negative amount decreases bank balance
    this.adjustAccountBalance(bankTransaction.bankAccountId, bankTransaction.amount);
    // CC side: positive amount (from backend) decreases CC debt
    // Since CC balance is stored as positive = debt, a positive CC_PAYMENT amount reduces debt
    this.adjustAccountBalance(ccTransaction.bankAccountId, -ccTransaction.amount);

    // Decrease CC Payment envelope allocation by the payment amount
    const ccPaymentEnv = this.ccPaymentEnvelopes().get(ccTransaction.bankAccountId);
    if (ccPaymentEnv?.id) {
      this.adjustEnvelopeAllocation(ccPaymentEnv.id, -ccTransaction.amount);
    }

    this.loadSpentSummaries();
  }

  /**
   * Optimistically update state after an account-to-account transfer.
   * Adds both the source-side and destination-side transactions, adjusts both balances.
   * No envelope changes — transfers don't affect budgets.
   */
  addTransfer(sourceTransaction: TransactionDTO, destTransaction: TransactionDTO): void {
    this.transactions.update(current => [sourceTransaction, destTransaction, ...current]);
    // Source side: negative amount decreases source balance (CC inversion applies)
    const sourceAccount = this.accounts().find(a => a.id === sourceTransaction.bankAccountId);
    const sourceIsCreditCard = sourceAccount?.accountType === 'CREDIT_CARD';
    const sourceBalanceChange = sourceIsCreditCard ? -sourceTransaction.amount : sourceTransaction.amount;
    this.adjustAccountBalance(sourceTransaction.bankAccountId, sourceBalanceChange);

    // Destination side: positive amount increases destination balance (CC inversion applies)
    const destAccount = this.accounts().find(a => a.id === destTransaction.bankAccountId);
    const destIsCreditCard = destAccount?.accountType === 'CREDIT_CARD';
    const destBalanceChange = destIsCreditCard ? -destTransaction.amount : destTransaction.amount;
    this.adjustAccountBalance(destTransaction.bankAccountId, destBalanceChange);

    this.loadSpentSummaries();
  }

  /** Check if an account is a credit card by its ID. */
  isCreditCard(accountId: string): boolean {
    const account = this.accounts().find(a => a.id === accountId);
    return account?.accountType === 'CREDIT_CARD';
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
   * Optimistically adjust a CC Payment envelope's allocatedBalance.
   * Used to reflect auto-move/refund-move changes without waiting for server refresh.
   */
  private adjustEnvelopeAllocation(envelopeId: string, amount: number): void {
    this.envelopes.update(current =>
      current.map(e =>
        e.id === envelopeId
          ? { ...e, allocatedBalance: (e.allocatedBalance ?? 0) + amount }
          : e
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
