import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DashboardStateService } from './dashboard-state.service';
import { BankAccountControllerService } from '../../core/api/api/bankAccountController.service';
import { EnvelopeCategoryControllerService } from '../../core/api/api/envelopeCategoryController.service';
import { EnvelopeControllerService } from '../../core/api/api/envelopeController.service';
import { TransactionControllerService } from '../../core/api/api/transactionController.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  mockBankAccount,
  mockCreditCard,
  mockEnvelope,
  mockCCPaymentEnvelope,
  mockEnvelopeCategory,
  mockCCPaymentCategory,
  mockTransaction,
  mockEnvelopeAllocation,
  mockSpentSummary,
  createMockBankAccountApi,
  createMockEnvelopeApi,
  createMockEnvelopeCategoryApi,
  createMockTransactionApi,
  createMockAuthService,
} from '../../testing/test-fixtures';

describe('DashboardStateService', () => {
  let service: DashboardStateService;
  let bankAccountApi: ReturnType<typeof createMockBankAccountApi>;
  let envelopeCategoryApi: ReturnType<typeof createMockEnvelopeCategoryApi>;
  let envelopeApi: ReturnType<typeof createMockEnvelopeApi>;
  let transactionApi: ReturnType<typeof createMockTransactionApi>;
  let authService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    bankAccountApi = createMockBankAccountApi();
    envelopeCategoryApi = createMockEnvelopeCategoryApi();
    envelopeApi = createMockEnvelopeApi();
    transactionApi = createMockTransactionApi();
    authService = createMockAuthService();

    TestBed.configureTestingModule({
      providers: [
        DashboardStateService,
        { provide: BankAccountControllerService, useValue: bankAccountApi },
        { provide: EnvelopeCategoryControllerService, useValue: envelopeCategoryApi },
        { provide: EnvelopeControllerService, useValue: envelopeApi },
        { provide: TransactionControllerService, useValue: transactionApi },
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(DashboardStateService);
  });

  // ── Computed signals ────────────────────────────────────────

  describe('computed signals', () => {
    it('bankAccounts filters out credit cards', () => {
      service.accounts.set([
        mockBankAccount(),
        mockCreditCard(),
        mockBankAccount({ id: 'sav-1', accountType: 'SAVINGS' }),
      ]);
      expect(service.bankAccounts().length).toBe(2);
      expect(service.bankAccounts().every(a => a.accountType !== 'CREDIT_CARD')).toBe(true);
    });

    it('creditCards returns only credit card accounts', () => {
      service.accounts.set([mockBankAccount(), mockCreditCard()]);
      expect(service.creditCards().length).toBe(1);
      expect(service.creditCards()[0].accountType).toBe('CREDIT_CARD');
    });

    it('totalBankBalance sums bank accounts minus credit card balances', () => {
      service.accounts.set([
        mockBankAccount({ currentBalance: 1000 }),
        mockBankAccount({ id: 'sav', accountType: 'SAVINGS', currentBalance: 2000 }),
        mockCreditCard({ currentBalance: 300 }),
      ]);
      // (1000 + 2000) - 300 = 2700
      expect(service.totalBankBalance()).toBe(2700);
    });

    it('unallocatedAmount = total cash - allocation - spent', () => {
      service.accounts.set([mockBankAccount({ currentBalance: 1000 })]);
      service.envelopes.set([mockEnvelope({ allocatedBalance: 300 })]);
      service.transactions.set([
        mockTransaction({ amount: -50, envelopeId: 'env-1' }),
      ]);
      // 1000 - 300 - (-50) = 750
      expect(service.unallocatedAmount()).toBe(750);
    });

    it('envelopesByCategory groups envelopes by category ID', () => {
      service.envelopes.set([
        mockEnvelope({ id: 'e1', envelopeCategoryId: 'cat-1' }),
        mockEnvelope({ id: 'e2', envelopeCategoryId: 'cat-1' }),
        mockEnvelope({ id: 'e3', envelopeCategoryId: 'cat-2' }),
      ]);
      const map = service.envelopesByCategory();
      expect(map.get('cat-1')!.length).toBe(2);
      expect(map.get('cat-2')!.length).toBe(1);
    });

    it('sortedEnvelopeCategories places CC_PAYMENT first', () => {
      service.envelopeCategories.set([
        mockEnvelopeCategory({ id: '1', name: 'Bills' }),
        mockCCPaymentCategory({ id: '2' }),
      ]);
      const sorted = service.sortedEnvelopeCategories();
      expect(sorted[0].categoryType).toBe('CC_PAYMENT');
    });

    it('ccPaymentEnvelopes maps CC account ID to envelope', () => {
      const ccEnv = mockCCPaymentEnvelope({ linkedAccountId: 'cc-1' });
      service.envelopes.set([mockEnvelope(), ccEnv]);
      expect(service.ccPaymentEnvelopes().get('cc-1')).toEqual(ccEnv);
    });

    it('standardEnvelopes excludes CC_PAYMENT type', () => {
      service.envelopes.set([
        mockEnvelope({ id: 'e1' }),
        mockCCPaymentEnvelope({ id: 'e2' }),
      ]);
      expect(service.standardEnvelopes().length).toBe(1);
      expect(service.standardEnvelopes()[0].id).toBe('e1');
    });

    it('standardCategories excludes CC_PAYMENT type', () => {
      service.envelopeCategories.set([
        mockEnvelopeCategory(),
        mockCCPaymentCategory(),
      ]);
      expect(service.standardCategories().length).toBe(1);
    });

    it('uncoveredDebtByCard shows positive values for underfunded cards', () => {
      service.accounts.set([mockCreditCard({ id: 'cc-1', currentBalance: 500 })]);
      service.envelopes.set([mockCCPaymentEnvelope({ linkedAccountId: 'cc-1', allocatedBalance: 200 })]);
      expect(service.uncoveredDebtByCard().get('cc-1')).toBe(300);
    });

    it('accountCount, envelopeCount, transactionCount reflect signal lengths', () => {
      service.accounts.set([mockBankAccount()]);
      service.envelopes.set([mockEnvelope(), mockEnvelope({ id: 'e2' })]);
      service.transactions.set([mockTransaction()]);
      expect(service.accountCount()).toBe(1);
      expect(service.envelopeCount()).toBe(2);
      expect(service.transactionCount()).toBe(1);
    });
  });

  // ── loadAll ─────────────────────────────────────────────────

  describe('loadAll', () => {
    it('populates all signals on success', () => {
      const accounts = [mockBankAccount()];
      const categories = [mockEnvelopeCategory()];
      const envelopes = [mockEnvelope()];
      const transactions = [mockTransaction()];
      const allocations = [mockEnvelopeAllocation()];

      bankAccountApi.getBankAccounts.mockReturnValue(of(accounts));
      envelopeCategoryApi.getEnvelopeCategories.mockReturnValue(of(categories));
      envelopeApi.getEnvelopes.mockReturnValue(of(envelopes));
      transactionApi.getAllTransactions.mockReturnValue(of(transactions));
      envelopeApi.getMonthlyAllocations.mockReturnValue(of(allocations));
      envelopeApi.getEnvelopeSpentSummary.mockReturnValue(of([]));

      service.loadAll();

      expect(service.accounts()).toEqual(accounts);
      expect(service.envelopeCategories()).toEqual(categories);
      expect(service.envelopes()).toEqual(envelopes);
      expect(service.transactions()).toEqual(transactions);
      expect(service.monthlyAllocations()).toEqual(allocations);
      expect(service.loading()).toBe(false);
      expect(service.loadError()).toBeNull();
    });

    it('bails without API calls when no auth token', () => {
      authService.getAccessToken.mockReturnValue(null);
      service.loadAll();
      expect(bankAccountApi.getBankAccounts).not.toHaveBeenCalled();
      expect(service.loading()).toBe(false);
    });

    it('sets loadError on partial failures but still loads successful data', () => {
      bankAccountApi.getBankAccounts.mockReturnValue(throwError(() => new Error('fail')));
      envelopeCategoryApi.getEnvelopeCategories.mockReturnValue(of([mockEnvelopeCategory()]));
      envelopeApi.getEnvelopes.mockReturnValue(of([mockEnvelope()]));
      transactionApi.getAllTransactions.mockReturnValue(of([]));
      envelopeApi.getMonthlyAllocations.mockReturnValue(of([]));
      envelopeApi.getEnvelopeSpentSummary.mockReturnValue(of([]));

      service.loadAll();

      expect(service.envelopeCategories().length).toBe(1);
      expect(service.loadError()).toContain('accounts');
      expect(service.loading()).toBe(false);
    });
  });

  // ── CRUD helpers ────────────────────────────────────────────

  describe('account CRUD', () => {
    it('addAccount appends to accounts', () => {
      service.accounts.set([mockBankAccount({ id: 'a1' })]);
      const newAccount = mockBankAccount({ id: 'a2', name: 'New' });
      service.addAccount(newAccount);
      expect(service.accounts().length).toBe(2);
      expect(service.accounts()[1].id).toBe('a2');
    });

    it('removeAccount filters out by ID', () => {
      service.accounts.set([
        mockBankAccount({ id: 'a1' }),
        mockBankAccount({ id: 'a2' }),
      ]);
      service.removeAccount('a1');
      expect(service.accounts().length).toBe(1);
      expect(service.accounts()[0].id).toBe('a2');
    });

    it('updateAccount replaces the matching account', () => {
      const original = mockBankAccount({ id: 'a1', name: 'Old' });
      service.accounts.set([original]);
      const updated = { ...original, name: 'Updated' };
      service.updateAccount('a1', updated);
      expect(service.accounts()[0].name).toBe('Updated');
    });
  });

  describe('envelope CRUD', () => {
    it('addEnvelope appends', () => {
      service.envelopes.set([]);
      service.addEnvelope(mockEnvelope());
      expect(service.envelopes().length).toBe(1);
    });

    it('removeEnvelope filters out by ID', () => {
      service.envelopes.set([mockEnvelope({ id: 'e1' }), mockEnvelope({ id: 'e2' })]);
      service.removeEnvelope('e1');
      expect(service.envelopes().length).toBe(1);
    });

    it('updateEnvelope replaces matching envelope', () => {
      service.envelopes.set([mockEnvelope({ id: 'e1', name: 'Old' })]);
      service.updateEnvelope('e1', mockEnvelope({ id: 'e1', name: 'New' }));
      expect(service.envelopes()[0].name).toBe('New');
    });
  });

  describe('category CRUD', () => {
    it('addCategory appends', () => {
      service.envelopeCategories.set([]);
      service.addCategory(mockEnvelopeCategory());
      expect(service.envelopeCategories().length).toBe(1);
    });

    it('removeCategory removes category and its child envelopes', () => {
      service.envelopeCategories.set([
        mockEnvelopeCategory({ id: 'cat-1' }),
        mockEnvelopeCategory({ id: 'cat-2' }),
      ]);
      service.envelopes.set([
        mockEnvelope({ id: 'e1', envelopeCategoryId: 'cat-1' }),
        mockEnvelope({ id: 'e2', envelopeCategoryId: 'cat-2' }),
      ]);
      service.removeCategory('cat-1');
      expect(service.envelopeCategories().length).toBe(1);
      expect(service.envelopes().length).toBe(1);
      expect(service.envelopes()[0].envelopeCategoryId).toBe('cat-2');
    });

    it('updateCategory replaces matching category', () => {
      service.envelopeCategories.set([mockEnvelopeCategory({ id: 'c1', name: 'Old' })]);
      service.updateCategory('c1', mockEnvelopeCategory({ id: 'c1', name: 'New' }));
      expect(service.envelopeCategories()[0].name).toBe('New');
    });
  });

  // ── Transaction operations ──────────────────────────────────

  describe('addTransaction', () => {
    beforeEach(() => {
      envelopeApi.getEnvelopeSpentSummary.mockReturnValue(of([]));
    });

    it('prepends transaction and adjusts bank account balance', () => {
      service.accounts.set([mockBankAccount({ id: 'acct-1', currentBalance: 1000 })]);
      service.transactions.set([]);

      const txn = mockTransaction({ amount: -50, bankAccountId: 'acct-1' });
      service.addTransaction(txn);

      expect(service.transactions().length).toBe(1);
      expect(service.transactions()[0]).toEqual(txn);
      // Bank balance: 1000 + (-50) = 950
      expect(service.accounts()[0].currentBalance).toBe(950);
    });

    it('inverts balance change for credit card transactions', () => {
      service.accounts.set([mockCreditCard({ id: 'cc-1', currentBalance: 500 })]);
      service.envelopes.set([]);
      service.transactions.set([]);

      // CC purchase: amount is -30, so balance change = -(-30) = +30 → debt goes up
      const txn = mockTransaction({ amount: -30, bankAccountId: 'cc-1' });
      service.addTransaction(txn);

      expect(service.accounts()[0].currentBalance).toBe(530);
    });

    it('auto-moves CC Payment envelope allocation on CC purchase with envelope', () => {
      const ccEnv = mockCCPaymentEnvelope({ id: 'env-cc', linkedAccountId: 'cc-1', allocatedBalance: 200 });
      service.accounts.set([mockCreditCard({ id: 'cc-1', currentBalance: 500 })]);
      service.envelopes.set([ccEnv]);
      service.transactions.set([]);

      const txn = mockTransaction({ amount: -30, bankAccountId: 'cc-1', envelopeId: 'env-grocery' });
      service.addTransaction(txn);

      // CC Payment envelope increases by |amount| = 30 → 200 + 30 = 230
      const updatedCCEnv = service.envelopes().find(e => e.id === 'env-cc');
      expect(updatedCCEnv!.allocatedBalance).toBe(230);
    });
  });

  describe('removeTransaction', () => {
    beforeEach(() => {
      envelopeApi.getEnvelopeSpentSummary.mockReturnValue(of([]));
    });

    it('removes transaction and reverses bank account balance', () => {
      service.accounts.set([mockBankAccount({ id: 'acct-1', currentBalance: 950 })]);
      const txn = mockTransaction({ id: 'txn-1', amount: -50, bankAccountId: 'acct-1' });
      service.transactions.set([txn]);

      service.removeTransaction('txn-1');

      expect(service.transactions().length).toBe(0);
      // Reverse: bank account balance goes 950 - (-50) = 1000
      expect(service.accounts()[0].currentBalance).toBe(1000);
    });

    it('handles CC_PAYMENT linked pair deletion', () => {
      service.accounts.set([
        mockBankAccount({ id: 'acct-1', currentBalance: 900 }),
        mockCreditCard({ id: 'cc-1', currentBalance: 400 }),
      ]);

      const bankTxn = mockTransaction({
        id: 'txn-bank',
        bankAccountId: 'acct-1',
        amount: -100,
        transactionType: 'CC_PAYMENT',
        linkedTransactionId: 'txn-cc',
      });
      const ccTxn = mockTransaction({
        id: 'txn-cc',
        bankAccountId: 'cc-1',
        amount: 100,
        transactionType: 'CC_PAYMENT',
        linkedTransactionId: 'txn-bank',
      });
      service.transactions.set([bankTxn, ccTxn]);

      service.removeTransaction('txn-bank');

      // Both transactions removed
      expect(service.transactions().length).toBe(0);
      // Bank balance reversed: 900 - (-100) = 1000
      expect(service.accounts()[0].currentBalance).toBe(1000);
      // CC balance reversed: CC has amount=100, isCreditCard=true → 400 + 100 = 500
      expect(service.accounts()[1].currentBalance).toBe(500);
    });
  });

  describe('addCCPayment', () => {
    beforeEach(() => {
      envelopeApi.getEnvelopeSpentSummary.mockReturnValue(of([]));
    });

    it('adds both transactions and adjusts both balances', () => {
      const ccEnv = mockCCPaymentEnvelope({ id: 'env-cc', linkedAccountId: 'cc-1', allocatedBalance: 400 });
      service.accounts.set([
        mockBankAccount({ id: 'acct-1', currentBalance: 1000 }),
        mockCreditCard({ id: 'cc-1', currentBalance: 500 }),
      ]);
      service.envelopes.set([ccEnv]);
      service.transactions.set([]);

      const bankTxn = mockTransaction({ id: 'b', bankAccountId: 'acct-1', amount: -200 });
      const ccTxn = mockTransaction({ id: 'c', bankAccountId: 'cc-1', amount: 200, transactionType: 'CC_PAYMENT' });

      service.addCCPayment(bankTxn, ccTxn);

      expect(service.transactions().length).toBe(2);
      // Bank: 1000 + (-200) = 800
      expect(service.accounts()[0].currentBalance).toBe(800);
      // CC: 500 - 200 = 300
      expect(service.accounts()[1].currentBalance).toBe(300);
      // CC Payment envelope: 400 - 200 = 200
      expect(service.envelopes()[0].allocatedBalance).toBe(200);
    });
  });

  // ── Utility methods ─────────────────────────────────────────

  describe('utility methods', () => {
    it('isCreditCard returns true for CC accounts', () => {
      service.accounts.set([mockCreditCard({ id: 'cc-1' }), mockBankAccount({ id: 'acct-1' })]);
      expect(service.isCreditCard('cc-1')).toBe(true);
      expect(service.isCreditCard('acct-1')).toBe(false);
    });

    it('removeTransactionsForAccount filters by bankAccountId', () => {
      service.transactions.set([
        mockTransaction({ id: 't1', bankAccountId: 'acct-1' }),
        mockTransaction({ id: 't2', bankAccountId: 'acct-2' }),
        mockTransaction({ id: 't3', bankAccountId: 'acct-1' }),
      ]);
      service.removeTransactionsForAccount('acct-1');
      expect(service.transactions().length).toBe(1);
      expect(service.transactions()[0].bankAccountId).toBe('acct-2');
    });

    it('updateMonthlyAllocation upserts allocation', () => {
      service.monthlyAllocations.set([]);
      service.updateMonthlyAllocation('env-1', 100);
      expect(service.monthlyAllocations().length).toBe(1);
      expect(service.monthlyAllocations()[0].amount).toBe(100);

      // Update existing
      service.updateMonthlyAllocation('env-1', 200);
      expect(service.monthlyAllocations().length).toBe(1);
      expect(service.monthlyAllocations()[0].amount).toBe(200);
    });
  });

  describe('loadMonthData', () => {
    it('sets viewedMonth and reloads allocations + spent summaries', () => {
      envelopeApi.getMonthlyAllocations.mockReturnValue(of([mockEnvelopeAllocation()]));
      envelopeApi.getEnvelopeSpentSummary.mockReturnValue(of([mockSpentSummary()]));

      service.loadMonthData('2026-02-01');

      expect(service.viewedMonth()).toBe('2026-02-01');
      expect(envelopeApi.getMonthlyAllocations).toHaveBeenCalledWith('2026-02-01');
      expect(service.monthlyAllocations().length).toBe(1);
    });
  });

  describe('updateTransaction', () => {
    beforeEach(() => {
      envelopeApi.getEnvelopeSpentSummary.mockReturnValue(of([]));
    });

    it('replaces the transaction and adjusts balance for same-account amount change', () => {
      service.accounts.set([mockBankAccount({ id: 'acct-1', currentBalance: 950 })]);
      const oldTxn = mockTransaction({ id: 't1', bankAccountId: 'acct-1', amount: -50 });
      service.transactions.set([oldTxn]);

      const newTxn = { ...oldTxn, amount: -80 };
      service.updateTransaction('t1', oldTxn, newTxn);

      expect(service.transactions()[0].amount).toBe(-80);
      // diff = -80 - (-50) = -30, same account non-CC: balance + diff = 950 + (-30) = 920
      expect(service.accounts()[0].currentBalance).toBe(920);
    });

    it('adjusts both accounts when bankAccountId changes', () => {
      service.accounts.set([
        mockBankAccount({ id: 'acct-1', currentBalance: 950 }),
        mockBankAccount({ id: 'acct-2', currentBalance: 500 }),
      ]);
      const oldTxn = mockTransaction({ id: 't1', bankAccountId: 'acct-1', amount: -50 });
      service.transactions.set([oldTxn]);

      const newTxn = { ...oldTxn, bankAccountId: 'acct-2', amount: -50 };
      service.updateTransaction('t1', oldTxn, newTxn);

      // Old account: 950 - (-50) = 1000 (reverse)
      expect(service.accounts()[0].currentBalance).toBe(1000);
      // New account: 500 + (-50) = 450 (apply)
      expect(service.accounts()[1].currentBalance).toBe(450);
    });
  });
});
