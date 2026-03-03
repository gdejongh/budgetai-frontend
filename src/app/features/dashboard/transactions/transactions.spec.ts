import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { Transactions } from './transactions';
import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { DashboardStateService } from '../dashboard-state.service';
import {
  mockBankAccount,
  mockCreditCard,
  mockEnvelope,
  mockTransaction,
  createMockTransactionApi,
} from '../../../testing/test-fixtures';

describe('Transactions', () => {
  let component: Transactions;
  let transactionApi: ReturnType<typeof createMockTransactionApi>;
  let dialog: MatDialog;
  let dashboardState: Record<string, ReturnType<typeof vi.fn> | unknown>;

  const txn1 = mockTransaction({
    id: 'txn-1',
    bankAccountId: 'acct-1',
    amount: -50,
    description: 'Groceries',
    transactionDate: '2026-03-15',
    envelopeId: 'env-1',
  });
  const txn2 = mockTransaction({
    id: 'txn-2',
    bankAccountId: 'acct-1',
    amount: 200,
    description: 'Paycheck',
    transactionDate: '2026-03-14',
  });
  const txn3 = mockTransaction({
    id: 'txn-3',
    bankAccountId: 'cc-1',
    amount: -25,
    description: 'Coffee',
    transactionDate: '2026-03-13',
  });

  beforeEach(async () => {
    transactionApi = createMockTransactionApi();

    dashboardState = {
      accounts: vi.fn().mockReturnValue([
        mockBankAccount({ id: 'acct-1', name: 'Checking' }),
        mockCreditCard({ id: 'cc-1', name: 'Visa' }),
      ]),
      envelopes: vi.fn().mockReturnValue([
        mockEnvelope({ id: 'env-1', name: 'Groceries' }),
      ]),
      transactions: vi.fn().mockReturnValue([txn1, txn2, txn3]),
      loading: vi.fn().mockReturnValue(false),
      transactionCount: vi.fn().mockReturnValue(3),
      addTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      removeTransaction: vi.fn(),
      loadTransactions: vi.fn(),
      loadEnvelopes: vi.fn(),
      isCreditCard: vi.fn().mockImplementation((id: string) => id === 'cc-1'),
      refresh: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Transactions],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: TransactionControllerService, useValue: transactionApi },
        { provide: DashboardStateService, useValue: dashboardState },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Transactions);
    component = fixture.componentInstance;
    dialog = (component as unknown as Record<string, MatDialog>)['dialog'];
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(undefined) } as MatDialogRef<unknown>);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('sorting', () => {
    it('defaults to date desc', () => {
      expect(component['sortColumn']()).toBe('date');
      expect(component['sortDirection']()).toBe('desc');
    });

    it('toggleSort switches direction when same column', () => {
      component.toggleSort('date');
      expect(component['sortDirection']()).toBe('asc');
    });

    it('toggleSort changes column and resets to asc', () => {
      component.toggleSort('amount');
      expect(component['sortColumn']()).toBe('amount');
      expect(component['sortDirection']()).toBe('asc');
    });

    it('sortIcon returns correct icons', () => {
      expect(component.sortIcon('date')).toBe('arrow_downward'); // desc
      expect(component.sortIcon('amount')).toBe('unfold_more'); // inactive
    });

    it('ariaSort returns correct values', () => {
      expect(component.ariaSort('date')).toBe('descending');
      expect(component.ariaSort('amount')).toBe('none');
    });

    it('sortedTransactions sorts by date desc by default', () => {
      const sorted = component['sortedTransactions']();
      expect(sorted[0].id).toBe('txn-1'); // 2026-03-15
      expect(sorted[1].id).toBe('txn-2'); // 2026-03-14
      expect(sorted[2].id).toBe('txn-3'); // 2026-03-13
    });

    it('sortedTransactions sorts by amount asc', () => {
      component.toggleSort('amount');
      const sorted = component['sortedTransactions']();
      expect(sorted[0].amount).toBe(-50);
      expect(sorted[1].amount).toBe(-25);
      expect(sorted[2].amount).toBe(200);
    });
  });

  describe('search', () => {
    it('searchedTransactions filters by description', () => {
      component['searchQuery'].set('grocer');
      const result = component['searchedTransactions']();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('txn-1');
    });

    it('searchedTransactions filters by account name', () => {
      component['searchQuery'].set('visa');
      const result = component['searchedTransactions']();
      expect(result).toHaveLength(1);
      expect(result[0].bankAccountId).toBe('cc-1');
    });

    it('searchedTransactions returns all when query empty', () => {
      component['searchQuery'].set('');
      expect(component['searchedTransactions']()).toHaveLength(3);
    });
  });

  describe('pagination', () => {
    it('defaults to page 0 and 25 per page', () => {
      expect(component['currentPage']()).toBe(0);
      expect(component['pageSize']()).toBe(25);
    });

    it('totalPages computes correctly', () => {
      expect(component['totalPages']()).toBe(1); // 3 txns / 25 = 1 page
    });

    it('paginatedTransactions returns correct slice', () => {
      expect(component['paginatedTransactions']()).toHaveLength(3);
    });

    it('pageStart and pageEnd are correct', () => {
      expect(component['pageStart']()).toBe(1);
      expect(component['pageEnd']()).toBe(3);
    });
  });

  describe('name maps', () => {
    it('accountNameMap maps id to name', () => {
      const map = component['accountNameMap']();
      expect(map['acct-1']).toBe('Checking');
      expect(map['cc-1']).toBe('Visa');
    });

    it('envelopeNameMap maps id to name', () => {
      const map = component['envelopeNameMap']();
      expect(map['env-1']).toBe('Groceries');
    });
  });

  describe('helpers', () => {
    it('absAmount returns absolute value', () => {
      expect(component.absAmount(-50)).toBe(50);
      expect(component.absAmount(200)).toBe(200);
    });

    it('formatDate parses YYYY-MM-DD', () => {
      const date = component.formatDate('2026-03-15');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(2);
      expect(date.getDate()).toBe(15);
    });

    it('isAccountCreditCard detects CC', () => {
      expect(component.isAccountCreditCard('cc-1')).toBe(true);
      expect(component.isAccountCreditCard('acct-1')).toBe(false);
    });
  });

  describe('dialogs', () => {
    it('openCreateDialog opens CreateTransactionDialog', () => {
      component.openCreateDialog();
      expect(dialog.open).toHaveBeenCalled();
    });

    it('openCreateDialog adds result to state', () => {
      const created = mockTransaction({ id: 'txn-new', bankAccountId: 'acct-1' });
      (vi.mocked(dialog.open)).mockReturnValue({ afterClosed: () => of(created) } as MatDialogRef<unknown>);

      component.openCreateDialog();
      expect((dashboardState['addTransaction'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(created);
    });

    it('openCreateDialog reloads envelopes for CC transactions with envelopeId', () => {
      const ccTxn = mockTransaction({ id: 'txn-cc', bankAccountId: 'cc-1', envelopeId: 'env-1' });
      (vi.mocked(dialog.open)).mockReturnValue({ afterClosed: () => of(ccTxn) } as MatDialogRef<unknown>);

      component.openCreateDialog();
      expect((dashboardState['loadEnvelopes'] as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });

    it('openEditDialog skips CC_PAYMENT transactions', () => {
      const ccPaymentTxn = mockTransaction({ transactionType: 'CC_PAYMENT' });
      const event = { target: { closest: () => null } } as unknown as Event;

      component.openEditDialog(event, ccPaymentTxn);
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('openEditDialog opens for normal transactions', () => {
      const event = { target: { closest: () => null } } as unknown as Event;

      component.openEditDialog(event, txn1);
      expect(dialog.open).toHaveBeenCalled();
      const [, config] = (vi.mocked(dialog.open)).mock.calls[0];
      expect(config!.data).toEqual({ transaction: txn1 });
    });
  });

  describe('delete flow', () => {
    it('deleteTransaction sets deletingId', () => {
      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.deleteTransaction(event, 'txn-1');
      expect(component['deletingId']()).toBe('txn-1');
    });

    it('cancelDelete clears deletingId', () => {
      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.deleteTransaction(event, 'txn-1');
      component.cancelDelete();
      expect(component['deletingId']()).toBeNull();
    });

    it('confirmDelete calls API and removes from state', () => {
      transactionApi.deleteTransaction.mockReturnValue(of(undefined));

      const event = { stopPropagation: vi.fn() } as unknown as Event;
      component.deleteTransaction(event, 'txn-1');
      component.confirmDelete();

      expect(transactionApi.deleteTransaction).toHaveBeenCalledWith('txn-1');
      expect((dashboardState['removeTransaction'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('txn-1');
    });
  });

  describe('ngOnInit', () => {
    it('does not load when transactions already present', () => {
      component.ngOnInit();
      expect((dashboardState['loadTransactions'] as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it('loads transactions when empty and not loading', () => {
      (dashboardState['transactions'] as ReturnType<typeof vi.fn>).mockReturnValue([]);
      component.ngOnInit();
      expect((dashboardState['loadTransactions'] as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });
});
