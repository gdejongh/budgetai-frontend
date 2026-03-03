import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ReconcileBalanceDialog, ReconcileBalanceDialogData } from './reconcile-balance-dialog';
import { BankAccountControllerService } from '../../../core/api/api/bankAccountController.service';
import { DashboardStateService } from '../dashboard-state.service';
import {
  mockBankAccount,
  createMockBankAccountApi,
  createMockDialogRef,
} from '../../../testing/test-fixtures';

describe('ReconcileBalanceDialog', () => {
  let component: ReconcileBalanceDialog;
  let bankAccountApi: ReturnType<typeof createMockBankAccountApi>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;
  let dashboardState: { updateAccount: ReturnType<typeof vi.fn>; loadTransactions: ReturnType<typeof vi.fn> };

  const account = mockBankAccount({ id: 'acct-1', currentBalance: 500 });

  beforeEach(async () => {
    bankAccountApi = createMockBankAccountApi();
    dialogRef = createMockDialogRef();
    dashboardState = {
      updateAccount: vi.fn(),
      loadTransactions: vi.fn(),
    };

    const dialogData: ReconcileBalanceDialogData = { account };

    await TestBed.configureTestingModule({
      imports: [ReconcileBalanceDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: BankAccountControllerService, useValue: bankAccountApi },
        { provide: DashboardStateService, useValue: dashboardState },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReconcileBalanceDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('adjustmentAmount', () => {
    it('is zero when form initializes with current balance', () => {
      // adjustmentAmount is a computed that reads form.value (non-reactive),
      // so it evaluates once on first read. target = current = 500 → 0.
      expect(component['adjustmentAmount']()).toBe(0);
    });
  });

  describe('form validation', () => {
    it('form is invalid with negative balance', () => {
      component['form'].controls.targetBalance.setValue(-1);
      expect(component['form'].controls.targetBalance.hasError('min')).toBe(true);
    });

    it('form is valid with non-negative balance', () => {
      component['form'].controls.targetBalance.setValue(600);
      expect(component['form'].valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('calls reconcileBankAccount, updates state, and closes', () => {
      const updated = mockBankAccount({ id: 'acct-1', currentBalance: 600 });
      bankAccountApi.reconcileBankAccount.mockReturnValue(of(updated));

      // Override the computed with a writable signal to simulate non-zero adjustment
      (component as unknown as Record<string, unknown>)['adjustmentAmount'] = signal(100);
      component['form'].controls.targetBalance.setValue(600);
      component.onSubmit();

      expect(bankAccountApi.reconcileBankAccount).toHaveBeenCalledWith('acct-1', { targetBalance: 600 });
      expect(dashboardState.updateAccount).toHaveBeenCalledWith('acct-1', updated);
      expect(dashboardState.loadTransactions).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(updated);
    });

    it('does not submit when adjustmentAmount is 0', () => {
      component.onSubmit();
      expect(bankAccountApi.reconcileBankAccount).not.toHaveBeenCalled();
    });

    it('sets errorMessage on API failure', () => {
      bankAccountApi.reconcileBankAccount.mockReturnValue(
        throwError(() => ({ error: { message: 'Reconcile failed' } }))
      );

      // Override the computed to allow submit path
      (component as unknown as Record<string, unknown>)['adjustmentAmount'] = signal(100);
      component['form'].controls.targetBalance.setValue(600);
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Reconcile failed');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('focus/blur helpers', () => {
    it('onBalanceFocus clears zero value', () => {
      component['form'].controls.targetBalance.setValue(0);
      component.onBalanceFocus();
      expect(component['form'].controls.targetBalance.value).toBeNull();
    });

    it('onBalanceBlur restores null to zero', () => {
      component['form'].controls.targetBalance.setValue(null as unknown as number);
      component.onBalanceBlur();
      expect(component['form'].controls.targetBalance.value).toBe(0);
    });
  });
});
