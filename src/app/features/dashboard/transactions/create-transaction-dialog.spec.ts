import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CreateTransactionDialog } from './create-transaction-dialog';
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

describe('CreateTransactionDialog', () => {
  let component: CreateTransactionDialog;
  let transactionApi: ReturnType<typeof createMockTransactionApi>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;
  let dashboardState: {
    accounts: ReturnType<typeof vi.fn>;
    standardEnvelopes: ReturnType<typeof vi.fn>;
    isCreditCard: ReturnType<typeof vi.fn>;
  };

  const bankAccount = mockBankAccount({ id: 'acct-1', name: 'Checking' });
  const creditCard = mockCreditCard({ id: 'cc-1', name: 'Visa' });

  beforeEach(async () => {
    transactionApi = createMockTransactionApi();
    dialogRef = createMockDialogRef();
    dashboardState = {
      accounts: vi.fn().mockReturnValue([bankAccount, creditCard]),
      standardEnvelopes: vi.fn().mockReturnValue([
        mockEnvelope({ id: 'env-1', name: 'Groceries' }),
        mockEnvelope({ id: 'env-2', name: 'Gas' }),
      ]),
      isCreditCard: vi.fn().mockImplementation((id: string) => id === 'cc-1'),
    };

    await TestBed.configureTestingModule({
      imports: [CreateTransactionDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TransactionControllerService, useValue: transactionApi },
        { provide: DashboardStateService, useValue: dashboardState },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CreateTransactionDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('form is invalid without bankAccountId', () => {
      expect(component['form'].controls.bankAccountId.hasError('required')).toBe(true);
    });

    it('form is invalid when amount is 0', () => {
      component['form'].controls.amount.setValue(0);
      expect(component['form'].controls.amount.hasError('min')).toBe(true);
    });

    it('form is valid with required fields', () => {
      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.merchantName.setValue('Amazon');
      component['form'].controls.amount.setValue(50);
      expect(component['form'].valid).toBe(true);
    });
  });

  describe('transaction type toggle', () => {
    it('defaults to withdrawal', () => {
      expect(component['transactionType']()).toBe('withdrawal');
    });

    it('updates dialogTitle for deposit/withdrawal', () => {
      component['transactionType'].set('deposit');
      expect(component['dialogTitle']()).toBe('New Deposit');

      component['transactionType'].set('withdrawal');
      expect(component['dialogTitle']()).toBe('New Withdrawal');
    });

    it('updates submitLabel for deposit/withdrawal', () => {
      component['transactionType'].set('deposit');
      expect(component['submitLabel']()).toBe('Add Deposit');

      component['transactionType'].set('withdrawal');
      expect(component['submitLabel']()).toBe('Add Withdrawal');
    });
  });

  describe('credit card detection', () => {
    it('isCreditCard returns false for bank account', () => {
      component['selectedAccountId'].set('acct-1');
      expect(component['isCreditCard']()).toBe(false);
    });

    it('isCreditCard returns true for credit card', () => {
      component['selectedAccountId'].set('cc-1');
      expect(component['isCreditCard']()).toBe(true);
    });

    it('shows CC-specific labels when credit card selected', () => {
      component['selectedAccountId'].set('cc-1');
      component['transactionType'].set('withdrawal');
      expect(component['dialogTitle']()).toBe('CC Purchase');
      expect(component['submitLabel']()).toBe('Add Purchase');

      component['transactionType'].set('deposit');
      expect(component['dialogTitle']()).toBe('CC Refund');
      expect(component['submitLabel']()).toBe('Add Refund');
    });
  });

  describe('envelope filtering', () => {
    it('returns all envelopes when search is empty', () => {
      component['envelopeSearchText'].set('');
      expect(component['filteredEnvelopes']()).toHaveLength(2);
    });

    it('filters envelopes by search text', () => {
      component['envelopeSearchText'].set('groc');
      const filtered = component['filteredEnvelopes']();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Groceries');
    });
  });

  describe('onSubmit', () => {
    it('creates withdrawal with negative amount', () => {
      const created = mockTransaction({ id: 'txn-1', amount: -50 });
      transactionApi.createTransaction.mockReturnValue(of(created));

      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.merchantName.setValue('Grocery Store');
      component['form'].controls.amount.setValue(50);
      component['form'].controls.transactionDate.setValue(new Date(2026, 2, 15));
      component['transactionType'].set('withdrawal');
      component.onSubmit();

      const [dto] = transactionApi.createTransaction.mock.calls[0];
      expect(dto.amount).toBe(-50);
      expect(dto.transactionDate).toBe('2026-03-15');
      expect(dialogRef.close).toHaveBeenCalledWith(created);
    });

    it('creates deposit with positive amount', () => {
      const created = mockTransaction({ id: 'txn-2', amount: 100 });
      transactionApi.createTransaction.mockReturnValue(of(created));

      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.merchantName.setValue('Employer');
      component['form'].controls.amount.setValue(100);
      component['form'].controls.transactionDate.setValue(new Date(2026, 2, 15));
      component['transactionType'].set('deposit');
      component.onSubmit();

      const [dto] = transactionApi.createTransaction.mock.calls[0];
      expect(dto.amount).toBe(100);
    });

    it('includes envelopeId when selected', () => {
      transactionApi.createTransaction.mockReturnValue(of(mockTransaction()));

      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.merchantName.setValue('Grocery Store');
      component['form'].controls.amount.setValue(25);
      component['form'].controls.envelopeId.setValue('env-1');
      component['form'].controls.transactionDate.setValue(new Date(2026, 2, 15));
      component.onSubmit();

      const [dto] = transactionApi.createTransaction.mock.calls[0];
      expect(dto.envelopeId).toBe('env-1');
    });

    it('sets errorMessage on API failure', () => {
      transactionApi.createTransaction.mockReturnValue(
        throwError(() => ({ error: { message: 'Create failed' } }))
      );

      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.merchantName.setValue('Store');
      component['form'].controls.amount.setValue(50);
      component['form'].controls.transactionDate.setValue(new Date(2026, 2, 15));
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Create failed');
      expect(component['loading']()).toBe(false);
    });

    it('does nothing when form is invalid', () => {
      component.onSubmit();
      expect(transactionApi.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('focus/blur helpers', () => {
    it('onAmountFocus clears zero', () => {
      component['form'].controls.amount.setValue(0);
      component.onAmountFocus();
      expect(component['form'].controls.amount.value).toBeNull();
    });

    it('onAmountBlur restores null to zero', () => {
      component['form'].controls.amount.setValue(null as unknown as number);
      component.onAmountBlur();
      expect(component['form'].controls.amount.value).toBe(0);
    });
  });

  describe('envelope helpers', () => {
    it('clearEnvelope resets form control and search text', () => {
      component['form'].controls.envelopeId.setValue('env-1');
      component['envelopeSearchText'].set('groc');
      component.clearEnvelope();
      expect(component['form'].controls.envelopeId.value).toBe('');
      expect(component['envelopeSearchText']()).toBe('');
    });

    it('envelopeDisplayFn returns name for valid id', () => {
      expect(component['envelopeDisplayFn']('env-1')).toBe('Groceries');
    });

    it('envelopeDisplayFn returns empty string for empty value', () => {
      expect(component['envelopeDisplayFn']('')).toBe('');
    });
  });
});
