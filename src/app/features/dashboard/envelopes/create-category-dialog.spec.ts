import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { CreateCategoryDialog } from './create-category-dialog';
import { EnvelopeCategoryControllerService } from '../../../core/api/api/envelopeCategoryController.service';
import {
  mockEnvelopeCategory,
  createMockEnvelopeCategoryApi,
  createMockDialogRef,
} from '../../../testing/test-fixtures';

describe('CreateCategoryDialog', () => {
  let component: CreateCategoryDialog;
  let categoryApi: ReturnType<typeof createMockEnvelopeCategoryApi>;
  let dialogRef: ReturnType<typeof createMockDialogRef>;

  beforeEach(async () => {
    categoryApi = createMockEnvelopeCategoryApi();
    dialogRef = createMockDialogRef();

    await TestBed.configureTestingModule({
      imports: [CreateCategoryDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: EnvelopeCategoryControllerService, useValue: categoryApi },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CreateCategoryDialog);
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

    it('form is valid with a name', () => {
      component['form'].controls.name.setValue('Bills');
      expect(component['form'].valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('calls createEnvelopeCategory and closes with result', () => {
      const created = mockEnvelopeCategory({ id: 'new-cat', name: 'Bills' });
      categoryApi.createEnvelopeCategory.mockReturnValue(of(created));

      component['form'].controls.name.setValue('Bills');
      component.onSubmit();

      expect(categoryApi.createEnvelopeCategory).toHaveBeenCalledWith({ name: 'Bills' });
      expect(dialogRef.close).toHaveBeenCalledWith(created);
      expect(component['loading']()).toBe(false);
    });

    it('sets errorMessage on API failure', () => {
      categoryApi.createEnvelopeCategory.mockReturnValue(
        throwError(() => ({ error: { message: 'Duplicate name' } }))
      );

      component['form'].controls.name.setValue('Bills');
      component.onSubmit();

      expect(component['errorMessage']()).toBe('Duplicate name');
      expect(component['loading']()).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('does nothing when form is invalid', () => {
      component['form'].controls.name.setValue('');
      component.onSubmit();
      expect(categoryApi.createEnvelopeCategory).not.toHaveBeenCalled();
    });
  });
});
