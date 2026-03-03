import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CreateAccountDialog } from './create-account-dialog';
import { BankAccountControllerService } from '../../../core/api/api/bankAccountController.service';
import { ConfettiService } from '../../../shared/services/confetti.service';
import {
  mockBankAccount,
  createMockBankAccountApi,
  createMockConfettiService,
  createMockDialogRef,
} from '../../../testing/test-fixtures';

describe('CreateAccountDialog', () => {
  let component: CreateAccountDialog;
  let bankAccountApi: ReturnType<typeof createMockBankAccountApi>;
  let confetti: ReturnType<typeof createMockConfettiService>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;

  beforeEach(async () => {
    bankAccountApi = createMockBankAccountApi();
    confetti = createMockConfettiService();
    dialogRef = createMockDialogRef();

    await TestBed.configureTestingModule({
      imports: [CreateAccountDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: BankAccountControllerService, useValue: bankAccountApi },
        { provide: ConfettiService, useValue: confetti },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CreateAccountDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('form is invalid when name is empty', () => {
      component['form'].controls.name.setValue('');
      expect(component['form'].invalid).toBe(true);
    });

    it('form is valid with name and default balance', () => {
      component['form'].controls.name.setValue('Test Account');
      expect(component['form'].valid).toBe(true);
    });

    it('form is invalid when balance is negative', () => {
      component['form'].controls.name.setValue('Test');
      component['form'].controls.currentBalance.setValue(-1);
      expect(component['form'].controls.currentBalance.hasError('min')).toBe(true);
    });
  });

  describe('account type toggle', () => {
    it('defaults to CHECKING', () => {
      expect(component['accountType']()).toBe('CHECKING');
    });

    it('updates computed values when type changes to CREDIT_CARD', () => {
      component['form'].controls.accountType.setValue('CREDIT_CARD');
      expect(component['accountType']()).toBe('CREDIT_CARD');
      expect(component['titleIcon']()).toBe('credit_card');
      expect(component['titleText']()).toBe('New Credit Card');
      expect(component['balanceLabel']()).toBe('Current Balance Owed');
      expect(component['namePlaceholder']()).toBe('e.g. Visa Rewards');
    });

    it('shows bank account computeds for CHECKING', () => {
      component['form'].controls.accountType.setValue('CHECKING');
      expect(component['titleIcon']()).toBe('account_balance');
      expect(component['titleText']()).toBe('New Bank Account');
      expect(component['balanceLabel']()).toBe('Current Balance');
    });

    it('shows savings placeholder for SAVINGS type', () => {
      component['form'].controls.accountType.setValue('SAVINGS');
      expect(component['namePlaceholder']()).toBe('e.g. Savings Account');
    });
  });

  describe('onSubmit', () => {
    it('calls API, fires confetti, and closes dialog on success', () => {
      const created = mockBankAccount({ id: 'new-1', name: 'Test' });
      bankAccountApi.createBankAccount.mockReturnValue(of(created));

      component['form'].controls.name.setValue('Test');
      component['form'].controls.currentBalance.setValue(500);
      component.onSubmit();

      expect(bankAccountApi.createBankAccount).toHaveBeenCalledWith({
        name: 'Test',
        currentBalance: 500,
        accountType: 'CHECKING',
      });
      expect(confetti.celebrate).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(created);
      expect(component['loading']()).toBe(false);
    });

    it('sets errorMessage on API failure', () => {
      bankAccountApi.createBankAccount.mockReturnValue(
        throwError(() => ({ error: { message: 'Server error' } }))
      );

      component['form'].controls.name.setValue('Test');
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Server error');
      expect(component['loading']()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('does nothing when form is invalid', () => {
      component['form'].controls.name.setValue('');
      component.onSubmit();
      expect(bankAccountApi.createBankAccount).not.toHaveBeenCalled();
    });
  });

  describe('focus/blur helpers', () => {
    it('onCurrentBalanceFocus clears zero value', () => {
      component['form'].controls.currentBalance.setValue(0);
      component.onCurrentBalanceFocus();
      expect(component['form'].controls.currentBalance.value).toBeNull();
    });

    it('onCurrentBalanceBlur restores null to zero', () => {
      component['form'].controls.currentBalance.setValue(null as unknown as number);
      component.onCurrentBalanceBlur();
      expect(component['form'].controls.currentBalance.value).toBe(0);
    });
  });
});
