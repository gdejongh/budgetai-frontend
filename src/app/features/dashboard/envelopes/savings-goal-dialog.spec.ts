import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { SavingsGoalDialog, SavingsGoalDialogData } from './savings-goal-dialog';
import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { DashboardStateService } from '../dashboard-state.service';
import {
  mockEnvelope,
  createMockEnvelopeApi,
  createMockDialogRef,
} from '../../../testing/test-fixtures';

describe('SavingsGoalDialog', () => {
  let envelopeApi: ReturnType<typeof createMockEnvelopeApi>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;
  let dashboardState: { updateEnvelope: ReturnType<typeof vi.fn> };

  function createComponent(envelopeOverrides: Partial<Parameters<typeof mockEnvelope>[0]> = {}) {
    const envelope = mockEnvelope({ id: 'env-1', name: 'Vacation Fund', ...envelopeOverrides });
    const dialogData: SavingsGoalDialogData = { envelope };

    TestBed.configureTestingModule({
      imports: [SavingsGoalDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: EnvelopeControllerService, useValue: envelopeApi },
        { provide: DashboardStateService, useValue: dashboardState },
      ],
    });

    const fixture = TestBed.createComponent(SavingsGoalDialog);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { component, fixture };
  }

  beforeEach(() => {
    envelopeApi = createMockEnvelopeApi();
    dialogRef = createMockDialogRef();
    dashboardState = { updateEnvelope: vi.fn() };
  });

  it('should create', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  describe('isEditing', () => {
    it('is false when envelope has no goalType', () => {
      const { component } = createComponent({ goalType: undefined });
      expect(component['isEditing']()).toBe(false);
    });

    it('is true when envelope has a goalType', () => {
      const { component } = createComponent({ goalType: 'MONTHLY', monthlyGoalTarget: 200 });
      expect(component['isEditing']()).toBe(true);
    });
  });

  describe('goal type switching', () => {
    it('defaults to MONTHLY when no existing goal', () => {
      const { component } = createComponent();
      expect(component['goalType']()).toBe('MONTHLY');
    });

    it('initializes to existing goal type', () => {
      const { component } = createComponent({ goalType: 'WEEKLY', monthlyGoalTarget: 50 });
      expect(component['goalType']()).toBe('WEEKLY');
    });

    it('isFormInvalid checks correct form per goalType', () => {
      const { component } = createComponent();

      // MONTHLY form with 0 value is invalid (min 0.01)
      component['goalType'].set('MONTHLY');
      component['monthlyForm'].controls.monthlyGoalTarget.setValue(0);
      expect(component.isFormInvalid()).toBe(true);

      component['monthlyForm'].controls.monthlyGoalTarget.setValue(100);
      expect(component.isFormInvalid()).toBe(false);

      // WEEKLY form
      component['goalType'].set('WEEKLY');
      component['weeklyForm'].controls.weeklyGoalTarget.setValue(0);
      expect(component.isFormInvalid()).toBe(true);

      component['weeklyForm'].controls.weeklyGoalTarget.setValue(50);
      expect(component.isFormInvalid()).toBe(false);

      // TARGET form
      component['goalType'].set('TARGET');
      component['targetForm'].controls.goalAmount.setValue(0);
      expect(component.isFormInvalid()).toBe(true);
    });
  });

  describe('TARGET computeds', () => {
    it('computes monthsUntilTarget from goalTargetDate', () => {
      const { component } = createComponent();
      component['goalType'].set('TARGET');
      // Set target roughly 6 months from March 2026
      component['targetForm'].controls.goalTargetDate.setValue('2026-09-01');
      expect(component['monthsUntilTarget']()).toBe(6);
    });

    it('computes monthly amount as ceil(goal / months)', () => {
      const { component } = createComponent();
      component['goalType'].set('TARGET');
      component['targetForm'].controls.goalAmount.setValue(1000);
      component['targetForm'].controls.goalTargetDate.setValue('2026-09-01');
      // 1000 / 6 = 166.67 → ceil to 166.67
      const monthly = component['computedMonthlyAmount']()!;
      expect(monthly).toBeGreaterThan(166);
      expect(monthly).toBeLessThanOrEqual(167);
    });

    it('returns null for computedMonthlyAmount when goal is 0', () => {
      const { component } = createComponent();
      component['goalType'].set('TARGET');
      component['targetForm'].controls.goalAmount.setValue(0);
      expect(component['computedMonthlyAmount']()).toBeNull();
    });
  });

  describe('onSubmit', () => {
    it('submits MONTHLY goal type correctly', () => {
      const saved = mockEnvelope({ id: 'env-1', goalType: 'MONTHLY', monthlyGoalTarget: 200 });
      envelopeApi.updateEnvelope.mockReturnValue(of(saved));

      const { component } = createComponent();
      component['goalType'].set('MONTHLY');
      component['monthlyForm'].controls.monthlyGoalTarget.setValue(200);
      component.onSubmit();

      expect(envelopeApi.updateEnvelope).toHaveBeenCalled();
      const [id, dto] = envelopeApi.updateEnvelope.mock.calls[0];
      expect(id).toBe('env-1');
      expect(dto.goalType).toBe('MONTHLY');
      expect(dto.monthlyGoalTarget).toBe(200);
      expect(dashboardState.updateEnvelope).toHaveBeenCalledWith('env-1', saved);
      expect(dialogRef.close).toHaveBeenCalledWith(saved);
    });

    it('submits WEEKLY goal type correctly', () => {
      const saved = mockEnvelope({ id: 'env-1', goalType: 'WEEKLY', monthlyGoalTarget: 50 });
      envelopeApi.updateEnvelope.mockReturnValue(of(saved));

      const { component } = createComponent();
      component['goalType'].set('WEEKLY');
      component['weeklyForm'].controls.weeklyGoalTarget.setValue(50);
      component.onSubmit();

      const [, dto] = envelopeApi.updateEnvelope.mock.calls[0];
      expect(dto.goalType).toBe('WEEKLY');
      expect(dto.monthlyGoalTarget).toBe(50);
    });

    it('submits TARGET goal type correctly', () => {
      const saved = mockEnvelope({ id: 'env-1', goalType: 'TARGET', goalAmount: 1000 });
      envelopeApi.updateEnvelope.mockReturnValue(of(saved));

      const { component } = createComponent();
      component['goalType'].set('TARGET');
      component['targetForm'].controls.goalAmount.setValue(1000);
      component['targetForm'].controls.goalTargetDate.setValue('2026-12-01');
      component.onSubmit();

      const [, dto] = envelopeApi.updateEnvelope.mock.calls[0];
      expect(dto.goalType).toBe('TARGET');
      expect(dto.goalAmount).toBe(1000);
      expect(dto.goalTargetDate).toBe('2026-12-01');
    });

    it('sets errorMessage on API failure', () => {
      envelopeApi.updateEnvelope.mockReturnValue(
        throwError(() => ({ error: { message: 'Save failed' } }))
      );

      const { component } = createComponent();
      component['monthlyForm'].controls.monthlyGoalTarget.setValue(200);
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Save failed');
      expect(component['loading']()).toBe(false);
    });
  });

  describe('onRemoveGoal', () => {
    it('clears all goal fields and calls API', () => {
      const saved = mockEnvelope({ id: 'env-1', goalType: undefined });
      envelopeApi.updateEnvelope.mockReturnValue(of(saved));

      const { component } = createComponent({ goalType: 'MONTHLY', monthlyGoalTarget: 200 });
      component.onRemoveGoal();

      const [, dto] = envelopeApi.updateEnvelope.mock.calls[0];
      expect(dto.goalType).toBeUndefined();
      expect(dto.goalAmount).toBeUndefined();
      expect(dto.monthlyGoalTarget).toBeUndefined();
      expect(dto.goalTargetDate).toBeUndefined();
      expect(dashboardState.updateEnvelope).toHaveBeenCalledWith('env-1', saved);
      expect(dialogRef.close).toHaveBeenCalledWith(saved);
    });

    it('sets errorMessage on remove failure', () => {
      envelopeApi.updateEnvelope.mockReturnValue(
        throwError(() => ({ error: { message: 'Remove failed' } }))
      );

      const { component } = createComponent({ goalType: 'MONTHLY', monthlyGoalTarget: 200 });
      component.onRemoveGoal();

      expect(component['errorMessage']()).toBe('Remove failed');
    });
  });
});
