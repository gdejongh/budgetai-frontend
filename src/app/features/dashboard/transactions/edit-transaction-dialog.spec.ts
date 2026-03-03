import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import {
  EditTransactionDialog,
  EditTransactionDialogData,
  EditTransactionDialogResult,
} from './edit-transaction-dialog';
import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { DashboardStateService } from '../dashboard-state.service';
import {
  mockBankAccount,
  mockCreditCard,
  mockEnvelope,
  mockTransaction,
  createMockTransactionApi,
  createMockDialogRef,
} from '../../../testing/test-fixtures';

describe('EditTransactionDialog', () => {
  let transactionApi: ReturnType<typeof createMockTransactionApi>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;
  let dashboardState: {
    accounts: ReturnType<typeof vi.fn>;
    envelopes: ReturnType<typeof vi.fn>;
    isCreditCard: ReturnType<typeof vi.fn>;
  };

  const bankAccount = mockBankAccount({ id: 'acct-1' });
  const creditCard = mockCreditCard({ id: 'cc-1' });

  function createComponent(transactionOverrides: Partial<Parameters<typeof mockTransaction>[0]> = {}) {
    const transaction = mockTransaction({
      id: 'txn-1',
      bankAccountId: 'acct-1',
      amount: -50,
      description: 'Groceries',
      transactionDate: '2026-03-15',
      envelopeId: 'env-1',
      ...transactionOverrides,
    });

    const dialogData: EditTransactionDialogData = { transaction };

    TestBed.configureTestingModule({
      imports: [EditTransactionDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: TransactionControllerService, useValue: transactionApi },
        { provide: DashboardStateService, useValue: dashboardState },
      ],
    });

    const fixture = TestBed.createComponent(EditTransactionDialog);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { component, fixture, transaction };
  }

  beforeEach(() => {
    transactionApi = createMockTransactionApi();
    dialogRef = createMockDialogRef();
    dashboardState = {
      accounts: vi.fn().mockReturnValue([bankAccount, creditCard]),
      envelopes: vi.fn().mockReturnValue([
        mockEnvelope({ id: 'env-1', name: 'Groceries' }),
      ]),
      isCreditCard: vi.fn().mockImplementation((id: string) => id === 'cc-1'),
    };
  });

  it('should create', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  describe('form pre-population', () => {
    it('initializes form from existing transaction', () => {
      const { component } = createComponent();
      expect(component['form'].controls.bankAccountId.value).toBe('acct-1');
      expect(component['form'].controls.amount.value).toBe(50); // absolute value
      expect(component['form'].controls.description.value).toBe('Groceries');
      expect(component['form'].controls.envelopeId.value).toBe('env-1');
    });

    it('sets transactionType to withdrawal for negative amounts', () => {
      const { component } = createComponent({ amount: -50 });
      expect(component['transactionType']()).toBe('withdrawal');
    });

    it('sets transactionType to deposit for positive amounts', () => {
      const { component } = createComponent({ amount: 100 });
      expect(component['transactionType']()).toBe('deposit');
    });

    it('parses date string into Date object', () => {
      const { component } = createComponent({ transactionDate: '2026-03-15' });
      const dateValue = component['form'].controls.transactionDate.value;
      expect(dateValue.getFullYear()).toBe(2026);
      expect(dateValue.getMonth()).toBe(2); // March = 2 (zero-indexed)
      expect(dateValue.getDate()).toBe(15);
    });
  });

  describe('computed signals', () => {
    it('dialogTitle for bank account withdrawal', () => {
      const { component } = createComponent();
      expect(component['dialogTitle']()).toBe('Edit Withdrawal');
    });

    it('dialogTitle for credit card purchase', () => {
      const { component } = createComponent({ bankAccountId: 'cc-1', amount: -50 });
      expect(component['dialogTitle']()).toBe('Edit Purchase');
    });

    it('dialogTitle for bank account deposit', () => {
      const { component } = createComponent({ amount: 100 });
      expect(component['dialogTitle']()).toBe('Edit Deposit');
    });

    it('isCreditCard detects CC account', () => {
      const { component } = createComponent({ bankAccountId: 'cc-1' });
      expect(component['isCreditCard']()).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('calls updateTransaction and closes with original + saved', () => {
      const savedTxn = mockTransaction({ id: 'txn-1', amount: -75 });
      transactionApi.updateTransaction.mockReturnValue(of(savedTxn));

      const { component, transaction } = createComponent();
      component['form'].controls.amount.setValue(75);
      component['transactionType'].set('withdrawal');
      component.onSubmit();

      expect(transactionApi.updateTransaction).toHaveBeenCalled();
      const [id, dto] = transactionApi.updateTransaction.mock.calls[0];
      expect(id).toBe('txn-1');
      expect(dto.amount).toBe(-75);
      expect(dto.transactionDate).toBe('2026-03-15');

      const result: EditTransactionDialogResult = dialogRef.close.mock.calls[0][0];
      expect(result.original).toEqual(transaction);
      expect(result.saved).toEqual(savedTxn);
    });

    it('sends positive amount for deposit', () => {
      transactionApi.updateTransaction.mockReturnValue(of(mockTransaction()));

      const { component } = createComponent();
      component['transactionType'].set('deposit');
      component['form'].controls.amount.setValue(200);
      component.onSubmit();

      const [, dto] = transactionApi.updateTransaction.mock.calls[0];
      expect(dto.amount).toBe(200);
    });

    it('sets errorMessage on API failure', () => {
      transactionApi.updateTransaction.mockReturnValue(
        throwError(() => ({ error: { message: 'Update failed' } }))
      );

      const { component } = createComponent();
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Update failed');
      expect(component['loading']()).toBe(false);
    });

    it('does nothing when form is invalid', () => {
      const { component } = createComponent();
      component['form'].controls.bankAccountId.setValue('');
      component.onSubmit();
      expect(transactionApi.updateTransaction).not.toHaveBeenCalled();
    });
  });

  describe('focus/blur helpers', () => {
    it('onAmountFocus clears zero', () => {
      const { component } = createComponent();
      component['form'].controls.amount.setValue(0);
      component.onAmountFocus();
      expect(component['form'].controls.amount.value).toBeNull();
    });

    it('onAmountBlur restores null to zero', () => {
      const { component } = createComponent();
      component['form'].controls.amount.setValue(null as unknown as number);
      component.onAmountBlur();
      expect(component['form'].controls.amount.value).toBe(0);
    });
  });
});
