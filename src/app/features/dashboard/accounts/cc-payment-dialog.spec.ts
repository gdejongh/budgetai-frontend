import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CCPaymentDialog, CCPaymentDialogData } from './cc-payment-dialog';
import { TransactionControllerService } from '../../../core/api/api/transactionController.service';
import { DashboardStateService } from '../dashboard-state.service';
import {
  mockBankAccount,
  mockCreditCard,
  createMockTransactionApi,
  createMockDialogRef,
  mockTransaction,
} from '../../../testing/test-fixtures';

describe('CCPaymentDialog', () => {
  let component: CCPaymentDialog;
  let transactionApi: ReturnType<typeof createMockTransactionApi>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;
  let dashboardState: { bankAccounts: ReturnType<typeof vi.fn>; refresh: ReturnType<typeof vi.fn> };

  const creditCard = mockCreditCard({ id: 'cc-1', currentBalance: 500 });

  beforeEach(async () => {
    transactionApi = createMockTransactionApi();
    dialogRef = createMockDialogRef();
    dashboardState = {
      bankAccounts: vi.fn().mockReturnValue([mockBankAccount({ id: 'acct-1' })]),
      refresh: vi.fn(),
    };

    const dialogData: CCPaymentDialogData = { creditCard };

    await TestBed.configureTestingModule({
      imports: [CCPaymentDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: TransactionControllerService, useValue: transactionApi },
        { provide: DashboardStateService, useValue: dashboardState },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CCPaymentDialog);
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
      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.amount.setValue(0);
      expect(component['form'].controls.amount.hasError('min')).toBe(true);
    });

    it('form is valid with all required fields', () => {
      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.amount.setValue(100);
      expect(component['form'].valid).toBe(true);
    });
  });

  describe('payFullBalance', () => {
    it('sets amount to credit card balance', () => {
      component.payFullBalance();
      expect(component['form'].controls.amount.value).toBe(500);
    });
  });

  describe('onSubmit', () => {
    it('calls createCCPayment, refreshes state, and closes dialog', () => {
      const result = mockTransaction({ id: 'txn-new' });
      transactionApi.createCCPayment.mockReturnValue(of(result));

      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.amount.setValue(200);
      component['form'].controls.transactionDate.setValue('2026-03-01');
      component.onSubmit();

      expect(transactionApi.createCCPayment).toHaveBeenCalledWith({
        bankAccountId: 'acct-1',
        creditCardId: 'cc-1',
        amount: 200,
        description: undefined,
        transactionDate: '2026-03-01',
      });
      expect(dashboardState.refresh).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(result);
    });

    it('sets errorMessage on API failure', () => {
      transactionApi.createCCPayment.mockReturnValue(
        throwError(() => ({ error: { message: 'Payment failed' } }))
      );

      component['form'].controls.bankAccountId.setValue('acct-1');
      component['form'].controls.amount.setValue(200);
      component['form'].controls.transactionDate.setValue('2026-03-01');
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Payment failed');
      expect(component['loading']()).toBe(false);
    });

    it('does nothing when form is invalid', () => {
      component.onSubmit();
      expect(transactionApi.createCCPayment).not.toHaveBeenCalled();
    });
  });

  describe('focus/blur helpers', () => {
    it('onAmountFocus clears zero value', () => {
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
});
