import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CreateEnvelopeDialog, CreateEnvelopeDialogData } from './create-envelope-dialog';
import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { DashboardStateService } from '../dashboard-state.service';
import { ConfettiService } from '../../../shared/services/confetti.service';
import {
  mockEnvelope,
  createMockEnvelopeApi,
  createMockConfettiService,
  createMockDialogRef,
} from '../../../testing/test-fixtures';

describe('CreateEnvelopeDialog', () => {
  let component: CreateEnvelopeDialog;
  let envelopeApi: ReturnType<typeof createMockEnvelopeApi>;
  let confetti: ReturnType<typeof createMockConfettiService>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;
  let dashboardState: { viewedMonth: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    envelopeApi = createMockEnvelopeApi();
    confetti = createMockConfettiService();
    dialogRef = createMockDialogRef();
    dashboardState = {
      viewedMonth: vi.fn().mockReturnValue('2026-03-01'),
    };

    const dialogData: CreateEnvelopeDialogData = { categoryId: 'cat-1' };

    await TestBed.configureTestingModule({
      imports: [CreateEnvelopeDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: EnvelopeControllerService, useValue: envelopeApi },
        { provide: DashboardStateService, useValue: dashboardState },
        { provide: ConfettiService, useValue: confetti },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CreateEnvelopeDialog);
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

    it('form is invalid when name exceeds 100 chars', () => {
      component['form'].controls.name.setValue('a'.repeat(101));
      expect(component['form'].controls.name.hasError('maxlength')).toBe(true);
    });

    it('form is invalid when allocatedBalance is negative', () => {
      component['form'].controls.name.setValue('Test');
      component['form'].controls.allocatedBalance.setValue(-1);
      expect(component['form'].controls.allocatedBalance.hasError('min')).toBe(true);
    });

    it('form is valid with name and zero allocation', () => {
      component['form'].controls.name.setValue('Groceries');
      component['form'].controls.allocatedBalance.setValue(0);
      expect(component['form'].valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('calls createEnvelope with categoryId, fires confetti, closes', () => {
      const created = mockEnvelope({ id: 'new-env' });
      envelopeApi.createEnvelope.mockReturnValue(of(created));

      component['form'].controls.name.setValue('Food');
      component['form'].controls.allocatedBalance.setValue(200);
      component.onSubmit();

      expect(envelopeApi.createEnvelope).toHaveBeenCalledWith({
        name: 'Food',
        allocatedBalance: 200,
        envelopeCategoryId: 'cat-1',
      });
      expect(confetti.celebrate).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledWith(created);
    });

    it('sets errorMessage on API failure', () => {
      envelopeApi.createEnvelope.mockReturnValue(
        throwError(() => ({ error: { message: 'Create failed' } }))
      );

      component['form'].controls.name.setValue('Food');
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Create failed');
      expect(component['loading']()).toBe(false);
    });

    it('does nothing when form is invalid', () => {
      component['form'].controls.name.setValue('');
      component.onSubmit();
      expect(envelopeApi.createEnvelope).not.toHaveBeenCalled();
    });
  });

  describe('focus/blur helpers', () => {
    it('onAllocatedBalanceFocus clears zero', () => {
      component['form'].controls.allocatedBalance.setValue(0);
      component.onAllocatedBalanceFocus();
      expect(component['form'].controls.allocatedBalance.value).toBeNull();
    });

    it('onAllocatedBalanceBlur restores null to zero', () => {
      component['form'].controls.allocatedBalance.setValue(null as unknown as number);
      component.onAllocatedBalanceBlur();
      expect(component['form'].controls.allocatedBalance.value).toBe(0);
    });
  });
});
