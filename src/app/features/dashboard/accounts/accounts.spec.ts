import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { Accounts } from './accounts';
import { BankAccountControllerService } from '../../../core/api/api/bankAccountController.service';
import { DashboardStateService } from '../dashboard-state.service';
import { PlaidService } from '../../../core/services/plaid.service';
import {
  mockBankAccount,
  mockCreditCard,
  mockTransaction,
  createMockBankAccountApi,
} from '../../../testing/test-fixtures';

describe('Accounts', () => {
  let component: Accounts;
  let bankAccountApi: ReturnType<typeof createMockBankAccountApi>;
  let dialog: MatDialog;
  let dashboardState: Record<string, ReturnType<typeof vi.fn>>;

  const checking = mockBankAccount({ id: 'acct-1', name: 'Checking', currentBalance: 1000 });
  const savings = mockBankAccount({ id: 'acct-2', name: 'Savings', currentBalance: 5000, accountType: 'SAVINGS' });
  const cc = mockCreditCard({ id: 'cc-1', name: 'Visa', currentBalance: 300 });

  beforeEach(async () => {
    bankAccountApi = createMockBankAccountApi();

    dashboardState = {
      accounts: vi.fn().mockReturnValue([checking, savings, cc]),
      bankAccounts: vi.fn().mockReturnValue([checking, savings]),
      creditCards: vi.fn().mockReturnValue([cc]),
      transactions: vi.fn().mockReturnValue([
        mockTransaction({ bankAccountId: 'acct-1' }),
        mockTransaction({ bankAccountId: 'acct-1' }),
        mockTransaction({ bankAccountId: 'cc-1' }),
      ]),
      loading: vi.fn().mockReturnValue(false),
      totalBankBalance: vi.fn().mockReturnValue(5700),
      transactionCount: vi.fn().mockReturnValue(3),
      uncoveredDebtByCard: vi.fn().mockReturnValue(new Map([['cc-1', 100]])),
      refresh: vi.fn(),
      loadTransactions: vi.fn(),
      addAccount: vi.fn(),
      removeAccount: vi.fn(),
      removeTransactionsForAccount: vi.fn(),
      updateAccount: vi.fn(),
      loadEnvelopes: vi.fn(),
      loadAll: vi.fn(),
      isCreditCard: vi.fn().mockImplementation((id: string) => id === 'cc-1'),
    };

    const plaidService = {
      openPlaidLink: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Accounts],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: BankAccountControllerService, useValue: bankAccountApi },
        { provide: DashboardStateService, useValue: dashboardState },
        { provide: PlaidService, useValue: plaidService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Accounts);
    component = fixture.componentInstance;
    dialog = (component as unknown as Record<string, MatDialog>)['dialog'];
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(undefined) } as MatDialogRef<unknown>);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('computed helpers', () => {
    it('txnCountForAccount returns count', () => {
      expect(component.txnCountForAccount('acct-1')).toBe(2);
      expect(component.txnCountForAccount('cc-1')).toBe(1);
      expect(component.txnCountForAccount('unknown')).toBe(0);
    });

    it('getUncoveredDebt returns debt for CC', () => {
      expect(component.getUncoveredDebt(cc)).toBe(100);
    });

    it('getUncoveredDebt returns 0 for non-CC account', () => {
      expect(component.getUncoveredDebt(checking)).toBe(0);
    });
  });

  describe('openCreateDialog', () => {
    it('opens CreateAccountDialog', () => {
      component.openCreateDialog();
      expect(dialog.open).toHaveBeenCalled();
      const [dialogComponent, config] = (vi.mocked(dialog.open)).mock.calls[0];
      expect(config!.width).toBe('440px');
    });

    it('adds created account to state on close', () => {
      const created = mockBankAccount({ id: 'new-1' });
      (vi.mocked(dialog.open)).mockReturnValue({ afterClosed: () => of(created) } as MatDialogRef<unknown>);

      component.openCreateDialog();

      expect(dashboardState['addAccount']).toHaveBeenCalledWith(created);
      expect(dashboardState['loadTransactions']).toHaveBeenCalled();
    });

    it('refreshes on CC account creation', () => {
      const createdCC = mockCreditCard({ id: 'cc-new' });
      (vi.mocked(dialog.open)).mockReturnValue({ afterClosed: () => of(createdCC) } as MatDialogRef<unknown>);

      component.openCreateDialog();

      expect(dashboardState['refresh']).toHaveBeenCalled();
    });
  });

  describe('openCCPaymentDialog', () => {
    it('opens CCPaymentDialog with credit card data', () => {
      component.openCCPaymentDialog(cc);
      expect(dialog.open).toHaveBeenCalled();
      const [, config] = (vi.mocked(dialog.open)).mock.calls[0];
      expect(config!.data).toEqual({ creditCard: cc });
    });
  });

  describe('openReconcileDialog', () => {
    it('opens ReconcileBalanceDialog with account data', () => {
      component.openReconcileDialog(checking);
      expect(dialog.open).toHaveBeenCalled();
      const [, config] = (vi.mocked(dialog.open)).mock.calls[0];
      expect(config!.data).toEqual({ account: checking });
    });
  });

  describe('deleteAccount flow', () => {
    it('sets deletingId when deleteAccount called', () => {
      component.deleteAccount('acct-1');
      expect(component['deletingId']()).toBe('acct-1');
    });

    it('clears deletingId on cancelDelete', () => {
      component.deleteAccount('acct-1');
      component.cancelDelete();
      expect(component['deletingId']()).toBeNull();
    });

    it('confirmDelete calls API and removes from state', () => {
      bankAccountApi.deleteBankAccount.mockReturnValue(of(undefined));

      component.deleteAccount('acct-1');
      component.confirmDelete();

      expect(bankAccountApi.deleteBankAccount).toHaveBeenCalledWith('acct-1');
      expect(dashboardState['removeAccount']).toHaveBeenCalledWith('acct-1');
      expect(dashboardState['removeTransactionsForAccount']).toHaveBeenCalledWith('acct-1');
      expect(component['deletingId']()).toBeNull();
    });
  });

  describe('inline editing', () => {
    it('onNameBlur saves when name changes', () => {
      bankAccountApi.updateBankAccount.mockReturnValue(of({ ...checking, name: 'New Name' }));

      const input = { value: 'New Name' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;
      component.onNameBlur(event, checking);

      expect(bankAccountApi.updateBankAccount).toHaveBeenCalled();
    });

    it('onNameBlur reverts empty name', () => {
      const input = { value: '' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;
      component.onNameBlur(event, checking);

      expect(input.value).toBe('Checking');
      expect(bankAccountApi.updateBankAccount).not.toHaveBeenCalled();
    });

    it('onNameBlur does nothing when name is unchanged', () => {
      const input = { value: 'Checking' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;
      component.onNameBlur(event, checking);

      expect(bankAccountApi.updateBankAccount).not.toHaveBeenCalled();
    });

    it('onBalanceBlur saves when balance changes for non-CC', () => {
      bankAccountApi.updateBankAccount.mockReturnValue(of({ ...checking, currentBalance: 2000 }));

      const input = { value: '2000' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;
      component.onBalanceBlur(event, checking);

      expect(bankAccountApi.updateBankAccount).toHaveBeenCalled();
    });

    it('onBalanceBlur skips CC accounts', () => {
      const input = { value: '500' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;
      component.onBalanceBlur(event, cc);

      expect(bankAccountApi.updateBankAccount).not.toHaveBeenCalled();
    });
  });

  describe('ngOnInit', () => {
    it('does not refresh when accounts already loaded', () => {
      component.ngOnInit();
      expect(dashboardState['refresh']).not.toHaveBeenCalled();
    });

    it('refreshes when accounts empty and not loading', () => {
      dashboardState['accounts'].mockReturnValue([]);
      component.ngOnInit();
      expect(dashboardState['refresh']).toHaveBeenCalled();
    });
  });
});
