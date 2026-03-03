import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <div class="auth-brand">
        <div class="logo-icon">
          <mat-icon>account_balance_wallet</mat-icon>
        </div>
        <h1 class="gradient-text">BudgetAI</h1>
        <p class="auth-subtitle">Start your smart budgeting journey</p>
      </div>

      <mat-card class="auth-card">
        <mat-card-content>
          <h2>Create account</h2>
          <p class="card-subtitle">Sign up to get started</p>

          @if (errorMessage()) {
            <div class="error-banner" role="alert">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="fill">
              <mat-label>Email</mat-label>
              <input matInput
                     formControlName="email"
                     type="email"
                     autocomplete="email">
              <mat-icon matPrefix>mail_outline</mat-icon>
              @if (form.controls.email.hasError('required') && form.controls.email.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.controls.email.hasError('email') && form.controls.email.touched) {
                <mat-error>Enter a valid email address</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Password</mat-label>
              <input matInput
                     formControlName="password"
                     [type]="hidePassword() ? 'password' : 'text'"
                     autocomplete="new-password">
              <mat-icon matPrefix>lock_outline</mat-icon>
              <button mat-icon-button
                      matSuffix
                      type="button"
                      (click)="hidePassword.set(!hidePassword())"
                      [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.hasError('required') && form.controls.password.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
                <mat-error>Password must be at least 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Confirm Password</mat-label>
              <input matInput
                     formControlName="confirmPassword"
                     [type]="hideConfirm() ? 'password' : 'text'"
                     autocomplete="new-password">
              <mat-icon matPrefix>lock_outline</mat-icon>
              <button mat-icon-button
                      matSuffix
                      type="button"
                      (click)="hideConfirm.set(!hideConfirm())"
                      [attr.aria-label]="hideConfirm() ? 'Show password' : 'Hide password'">
                <mat-icon>{{ hideConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.confirmPassword.hasError('required') && form.controls.confirmPassword.touched) {
                <mat-error>Please confirm your password</mat-error>
              }
              @if (form.hasError('passwordsMismatch') && form.controls.confirmPassword.touched && !form.controls.confirmPassword.hasError('required')) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button
                    color="primary"
                    type="submit"
                    class="submit-btn"
                    [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Create Account
              }
            </button>
          </form>

          <p class="auth-link">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
        </mat-card-content>
      </mat-card>

      <footer class="auth-footer">
        <span>This is a personal project for demonstration purposes only and does not constitute financial advice.</span>
      </footer>
    </div>
  `,
  styles: `
    .auth-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(34, 211, 238, 0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(129, 140, 248, 0.06) 0%, transparent 50%),
        var(--bg-primary);
    }

    .auth-brand {
      text-align: center;
      margin-bottom: 2rem;

      .logo-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: var(--radius-lg);
        background: var(--accent-gradient);
        margin-bottom: 1rem;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: #0b0e14;
        }
      }

      h1 {
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
    }

    .auth-subtitle {
      color: var(--text-secondary);
      font-size: 0.95rem;
      margin-top: 0.25rem;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;

      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .card-subtitle {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
      border-radius: var(--radius-sm);
      color: var(--danger);
      font-size: 0.875rem;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .submit-btn {
      height: 48px;
      font-size: 1rem;
      margin-top: 0.5rem;
      width: 100%;
    }

    .auth-link {
      text-align: center;
      margin-top: 1.5rem;
      color: var(--text-secondary);
      font-size: 0.9rem;

      a {
        color: var(--accent-primary);
        font-weight: 500;
      }
    }

    .auth-footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
      max-width: 420px;
      line-height: 1.4;
    }
  `
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly hidePassword = signal(true);
  protected readonly hideConfirm = signal(true);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatchValidator });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    this.authService.register({ email, password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message
          ?? err.error?.fieldErrors?.email
          ?? 'Registration failed. Please try again.';
        this.errorMessage.set(msg);
      },
    });
  }
}
