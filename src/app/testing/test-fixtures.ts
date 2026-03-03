import { BankAccountDTO } from '../core/api/model/bankAccountDTO';
import { EnvelopeCategoryDTO } from '../core/api/model/envelopeCategoryDTO';
import { EnvelopeDTO } from '../core/api/model/envelopeDTO';
import { EnvelopeAllocationDTO } from '../core/api/model/envelopeAllocationDTO';
import { EnvelopeSpentSummaryDTO } from '../core/api/model/envelopeSpentSummaryDTO';
import { TransactionDTO } from '../core/api/model/transactionDTO';

// ── Factory helpers ──────────────────────────────────────────────

export function mockBankAccount(overrides: Partial<BankAccountDTO> = {}): BankAccountDTO {
  return {
    id: 'acct-1',
    appUserId: 'user-1',
    name: 'Main Checking',
    accountType: 'CHECKING',
    currentBalance: 1000,
    manual: true,
    ...overrides,
  };
}

export function mockCreditCard(overrides: Partial<BankAccountDTO> = {}): BankAccountDTO {
  return mockBankAccount({
    id: 'cc-1',
    name: 'Visa Rewards',
    accountType: 'CREDIT_CARD',
    currentBalance: 500,
    ...overrides,
  });
}

export function mockSavingsAccount(overrides: Partial<BankAccountDTO> = {}): BankAccountDTO {
  return mockBankAccount({
    id: 'sav-1',
    name: 'Savings Account',
    accountType: 'SAVINGS',
    currentBalance: 5000,
    ...overrides,
  });
}

export function mockEnvelopeCategory(overrides: Partial<EnvelopeCategoryDTO> = {}): EnvelopeCategoryDTO {
  return {
    id: 'cat-1',
    appUserId: 'user-1',
    name: 'Bills',
    categoryType: 'STANDARD',
    ...overrides,
  };
}

export function mockCCPaymentCategory(overrides: Partial<EnvelopeCategoryDTO> = {}): EnvelopeCategoryDTO {
  return mockEnvelopeCategory({
    id: 'cat-cc',
    name: 'Credit Card Payments',
    categoryType: 'CC_PAYMENT',
    ...overrides,
  });
}

export function mockEnvelope(overrides: Partial<EnvelopeDTO> = {}): EnvelopeDTO {
  return {
    id: 'env-1',
    appUserId: 'user-1',
    envelopeCategoryId: 'cat-1',
    name: 'Groceries',
    allocatedBalance: 300,
    ...overrides,
  };
}

export function mockCCPaymentEnvelope(overrides: Partial<EnvelopeDTO> = {}): EnvelopeDTO {
  return mockEnvelope({
    id: 'env-cc-1',
    name: 'Visa Rewards Payment',
    envelopeCategoryId: 'cat-cc',
    envelopeType: 'CC_PAYMENT',
    linkedAccountId: 'cc-1',
    allocatedBalance: 200,
    ...overrides,
  });
}

export function mockTransaction(overrides: Partial<TransactionDTO> = {}): TransactionDTO {
  return {
    id: 'txn-1',
    appUserId: 'user-1',
    bankAccountId: 'acct-1',
    amount: -50,
    description: 'Grocery Store',
    transactionDate: '2026-03-01',
    ...overrides,
  };
}

export function mockEnvelopeAllocation(overrides: Partial<EnvelopeAllocationDTO> = {}): EnvelopeAllocationDTO {
  return {
    envelopeId: 'env-1',
    yearMonth: '2026-03-01',
    amount: 300,
    ...overrides,
  };
}

export function mockSpentSummary(overrides: Partial<EnvelopeSpentSummaryDTO> = {}): EnvelopeSpentSummaryDTO {
  return {
    envelopeId: 'env-1',
    totalSpent: -150,
    periodSpent: -50,
    ...overrides,
  };
}

// ── Common mock service factories ────────────────────────────────

export function createMockBankAccountApi() {
  return {
    getBankAccounts: vi.fn(),
    createBankAccount: vi.fn(),
    deleteBankAccount: vi.fn(),
    updateBankAccount: vi.fn(),
    reconcileBankAccount: vi.fn(),
  };
}

export function createMockEnvelopeApi() {
  return {
    getEnvelopes: vi.fn(),
    createEnvelope: vi.fn(),
    updateEnvelope: vi.fn(),
    deleteEnvelope: vi.fn(),
    getMonthlyAllocations: vi.fn(),
    setMonthlyAllocation: vi.fn(),
    getEnvelopeSpentSummary: vi.fn(),
  };
}

export function createMockEnvelopeCategoryApi() {
  return {
    getEnvelopeCategories: vi.fn(),
    createEnvelopeCategory: vi.fn(),
    deleteEnvelopeCategory: vi.fn(),
    updateEnvelopeCategory: vi.fn(),
  };
}

export function createMockTransactionApi() {
  return {
    getAllTransactions: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    createCCPayment: vi.fn(),
  };
}

export function createMockAuthService() {
  return {
    getAccessToken: vi.fn().mockReturnValue('mock-token'),
    isAuthenticated: vi.fn().mockReturnValue(true),
    userId: vi.fn().mockReturnValue('user-1'),
  };
}

export function createMockConfettiService() {
  return {
    celebrate: vi.fn(),
    burst: vi.fn(),
  };
}

export function createMockDialogRef() {
  return {
    close: vi.fn(),
    addPanelClass: vi.fn(),
    removePanelClass: vi.fn(),
  };
}
