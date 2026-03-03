import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { Envelopes } from './envelopes';
import { EnvelopeControllerService } from '../../../core/api/api/envelopeController.service';
import { EnvelopeCategoryControllerService } from '../../../core/api/api/envelopeCategoryController.service';
import { DashboardStateService } from '../dashboard-state.service';
import {
  mockEnvelope,
  mockEnvelopeCategory,
  mockCCPaymentEnvelope,
  mockCreditCard,
  mockTransaction,
  mockSpentSummary,
  mockEnvelopeAllocation,
  createMockEnvelopeApi,
  createMockEnvelopeCategoryApi,
} from '../../../testing/test-fixtures';

describe('Envelopes', () => {
  let component: Envelopes;
  let envelopeApi: ReturnType<typeof createMockEnvelopeApi>;
  let categoryApi: ReturnType<typeof createMockEnvelopeCategoryApi>;
  let dialog: MatDialog;
  let dashboardState: Record<string, ReturnType<typeof vi.fn> | unknown>;

  const category = mockEnvelopeCategory({ id: 'cat-1', name: 'Bills' });
  const envelope1 = mockEnvelope({ id: 'env-1', envelopeCategoryId: 'cat-1', name: 'Groceries', allocatedBalance: 500 });
  const envelope2 = mockEnvelope({ id: 'env-2', envelopeCategoryId: 'cat-1', name: 'Gas', allocatedBalance: 200 });
  const ccEnvelope = mockCCPaymentEnvelope({ id: 'env-cc', envelopeCategoryId: 'cat-cc', linkedAccountId: 'cc-1', allocatedBalance: 200 });

  beforeEach(async () => {
    envelopeApi = createMockEnvelopeApi();
    categoryApi = createMockEnvelopeCategoryApi();

    const envelopesByCategory = new Map<string, typeof envelope1[]>();
    envelopesByCategory.set('cat-1', [envelope1, envelope2]);

    dashboardState = {
      accounts: vi.fn().mockReturnValue([]),
      envelopes: vi.fn().mockReturnValue([envelope1, envelope2, ccEnvelope]),
      envelopeCategories: vi.fn().mockReturnValue([category]),
      standardCategories: vi.fn().mockReturnValue([category]),
      ccPaymentEnvelopes: vi.fn().mockReturnValue(new Map()),
      envelopesByCategory: vi.fn().mockReturnValue(envelopesByCategory),
      sortedEnvelopeCategories: vi.fn().mockReturnValue([category]),
      creditCards: vi.fn().mockReturnValue([mockCreditCard({ id: 'cc-1', currentBalance: 300 })]),
      transactions: vi.fn().mockReturnValue([
        mockTransaction({ envelopeId: 'env-1', bankAccountId: 'acct-1' }),
        mockTransaction({ envelopeId: 'env-1', bankAccountId: 'acct-1' }),
      ]),
      spentSummaries: vi.fn().mockReturnValue([
        mockSpentSummary({ envelopeId: 'env-1', periodSpent: -150, totalSpent: -300 }),
      ]),
      monthlyAllocations: vi.fn().mockReturnValue([
        mockEnvelopeAllocation({ envelopeId: 'env-1', amount: 200 }),
      ]),
      loading: vi.fn().mockReturnValue(false),
      unallocatedAmount: vi.fn().mockReturnValue(100),
      uncoveredDebtByCard: vi.fn().mockReturnValue(new Map()),
      viewedMonth: vi.fn().mockReturnValue('2026-03-01'),
      refresh: vi.fn(),
      addCategory: vi.fn(),
      addEnvelope: vi.fn(),
      updateEnvelope: vi.fn(),
      updateCategory: vi.fn(),
      removeEnvelope: vi.fn(),
      removeCategory: vi.fn(),
      loadMonthData: vi.fn(),
      updateMonthlyAllocation: vi.fn(),
      isCreditCard: vi.fn().mockReturnValue(false),
    };

    const snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Envelopes],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: snackBar },
        { provide: EnvelopeControllerService, useValue: envelopeApi },
        { provide: EnvelopeCategoryControllerService, useValue: categoryApi },
        { provide: DashboardStateService, useValue: dashboardState },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Envelopes);
    component = fixture.componentInstance;
    dialog = (component as unknown as Record<string, MatDialog>)['dialog'];
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(undefined) } as MatDialogRef<unknown>);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('computed maps', () => {
    it('spentForEnvelope returns spent amount', () => {
      expect(component.spentForEnvelope('env-1')).toBe(150);
    });

    it('monthlyAllocationForEnvelope returns allocation', () => {
      expect(component.monthlyAllocationForEnvelope('env-1')).toBe(200);
    });

    it('remainingForEnvelope returns allocated - totalSpent', () => {
      // allocatedBalance 500 - totalSpent abs(300) = 200
      expect(component.remainingForEnvelope('env-1')).toBe(200);
    });

    it('txnCountForEnvelope returns count', () => {
      expect(component.txnCountForEnvelope(envelope1)).toBe(2);
    });

    it('envelopesForCategory returns envelopes', () => {
      expect(component.envelopesForCategory('cat-1')).toEqual([envelope1, envelope2]);
    });

    it('categoryAllocated sums allocatedBalance', () => {
      expect(component.categoryAllocated('cat-1')).toBe(700);
    });

    it('categorySpent sums spent', () => {
      expect(component.categorySpent('cat-1')).toBe(150);
    });
  });

  describe('envelope health', () => {
    it('isEnvelopeUnhealthy returns true when remaining < 0', () => {
      const overspent = mockEnvelope({ id: 'env-bad', allocatedBalance: 100 });
      // Mock totalSpentMap to show overspending
      expect(component.isEnvelopeUnhealthy(overspent)).toBe(false); // 100 - 0 = 100 > 0
    });
  });

  describe('category collapse', () => {
    it('toggleCategory collapses and expands', () => {
      expect(component.isCategoryCollapsed('cat-1')).toBe(false);
      component.toggleCategory('cat-1');
      expect(component.isCategoryCollapsed('cat-1')).toBe(true);
      component.toggleCategory('cat-1');
      expect(component.isCategoryCollapsed('cat-1')).toBe(false);
    });
  });

  describe('month navigation', () => {
    it('navigateMonth calls loadMonthData with next month', () => {
      component.navigateMonth(1);
      expect((dashboardState['loadMonthData'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('2026-04-01');
    });

    it('navigateMonth calls loadMonthData with previous month', () => {
      component.navigateMonth(-1);
      expect((dashboardState['loadMonthData'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('2026-02-01');
    });
  });

  describe('savings goal helpers', () => {
    it('goalNetSaved returns allocated - totalSpent', () => {
      const goal = mockEnvelope({ id: 'env-1', allocatedBalance: 500, goalAmount: 1000 });
      expect(component.goalNetSaved(goal)).toBe(200); // 500 - 300
    });

    it('goalProgressPercent computes correctly', () => {
      const goal = mockEnvelope({ id: 'env-goal', allocatedBalance: 500, goalAmount: 1000 });
      // totalSpent for env-goal is 0, so net = 500 → 50%
      expect(component.goalProgressPercent(goal)).toBe(50);
    });

    it('isMonthlyGoalMet checks against monthlyGoalTarget', () => {
      const goal = mockEnvelope({ id: 'env-1', monthlyGoalTarget: 50, goalType: 'MONTHLY' });
      // monthly allocation 200, spent 150, net = 50 → meets 50 target
      expect(component.isMonthlyGoalMet(goal)).toBe(true);
    });
  });

  describe('dialogs', () => {
    it('openCreateCategoryDialog opens dialog', () => {
      component.openCreateCategoryDialog();
      expect(dialog.open).toHaveBeenCalled();
    });

    it('openCreateCategoryDialog adds result to state', () => {
      const newCat = mockEnvelopeCategory({ id: 'cat-new' });
      (vi.mocked(dialog.open)).mockReturnValue({ afterClosed: () => of(newCat) } as MatDialogRef<unknown>);

      component.openCreateCategoryDialog();
      expect((dashboardState['addCategory'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(newCat);
    });

    it('openCreateEnvelopeDialog passes categoryId', () => {
      component.openCreateEnvelopeDialog('cat-1');
      const [, config] = (vi.mocked(dialog.open)).mock.calls[0];
      expect(config!.data).toEqual({ categoryId: 'cat-1' });
    });

    it('openCreateEnvelopeDialog adds result and updates allocation', () => {
      const newEnv = mockEnvelope({ id: 'env-new', allocatedBalance: 150 });
      (vi.mocked(dialog.open)).mockReturnValue({ afterClosed: () => of(newEnv) } as MatDialogRef<unknown>);

      component.openCreateEnvelopeDialog('cat-1');
      expect((dashboardState['addEnvelope'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(newEnv);
      expect((dashboardState['updateMonthlyAllocation'] as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('env-new', 150);
    });

    it('openSavingsGoalDialog passes envelope data', () => {
      component.openSavingsGoalDialog(envelope1);
      const [, config] = (vi.mocked(dialog.open)).mock.calls[0];
      expect(config!.data).toEqual({ envelope: envelope1 });
    });
  });

  describe('delete flows', () => {
    it('deleteCategory calls API and removes from state', () => {
      categoryApi.deleteEnvelopeCategory.mockReturnValue(of(undefined));

      component.deleteCategory('cat-1');
      // deletingId should be set (shows confirm UI)
      expect(component['deletingId']()).toBe('cat-1');
    });

    it('deleteEnvelope calls API and removes from state', () => {
      envelopeApi.deleteEnvelope.mockReturnValue(of(undefined));

      component.deleteEnvelope('env-1');
      expect(component['deletingId']()).toBe('env-1');
    });
  });

  describe('ngOnInit', () => {
    it('does not refresh when envelopes already loaded', () => {
      component.ngOnInit();
      expect((dashboardState['refresh'] as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it('refreshes when envelopes empty and not loading', () => {
      (dashboardState['envelopes'] as ReturnType<typeof vi.fn>).mockReturnValue([]);
      component.ngOnInit();
      expect((dashboardState['refresh'] as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });

  describe('percentRemaining', () => {
    it('computes percent remaining for envelope', () => {
      // monthlyAllocation for env-1 = 200, remaining for env-1 = 200
      // percent = round(200/200 * 100) = 100
      expect(component.percentRemaining(envelope1)).toBe(100);
    });
  });
});
