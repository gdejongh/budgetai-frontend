import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { DeleteAccountDialog } from './delete-account-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardStateService } from '../dashboard-state.service';
import { createMockDialogRef } from '../../../testing/test-fixtures';

describe('DeleteAccountDialog', () => {
  let component: DeleteAccountDialog;
  let authService: {
    userEmail: () => string | null;
    deleteCurrentUser: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
  };
  let dashboardState: { reset: ReturnType<typeof vi.fn> };
  let dialogRef: ReturnType<typeof createMockDialogRef>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      userEmail: () => 'user@example.com',
      deleteCurrentUser: vi.fn(),
      clearSession: vi.fn(),
    };
    dashboardState = {
      reset: vi.fn(),
    };
    dialogRef = createMockDialogRef();
    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DeleteAccountDialog],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authService },
        { provide: DashboardStateService, useValue: dashboardState },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DeleteAccountDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requires explicit confirmation before deleting', () => {
    component.confirmDelete();

    expect(authService.deleteCurrentUser).not.toHaveBeenCalled();
  });

  it('deletes the account and clears local state on success', () => {
    authService.deleteCurrentUser.mockReturnValue(of(void 0));
    component['form'].controls.confirmationText.setValue('DELETE');
    component['form'].controls.understandsConsequences.setValue(true);

    component.confirmDelete();

    expect(authService.deleteCurrentUser).toHaveBeenCalled();
    expect(dashboardState.reset).toHaveBeenCalled();
    expect(authService.clearSession).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('surfaces api errors and keeps the dialog open', () => {
    authService.deleteCurrentUser.mockReturnValue(
      throwError(() => ({ error: { message: 'Deletion failed' } }))
    );
    component['form'].controls.confirmationText.setValue('DELETE');
    component['form'].controls.understandsConsequences.setValue(true);

    component.confirmDelete();

    expect(component['errorMessage']()).toBe('Deletion failed');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(authService.clearSession).not.toHaveBeenCalled();
  });
});
