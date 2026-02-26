import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, switchMap, of, catchError } from 'rxjs';

import { AuthControllerService } from '../api/api/authController.service';
import { AppUserControllerService } from '../api/api/appUserController.service';
import { AuthResponseDTO } from '../api/model/authResponseDTO';
import { AppUserDTO } from '../api/model/appUserDTO';

const TOKEN_KEY = 'budget_access_token';
const REFRESH_KEY = 'budget_refresh_token';
const USER_ID_KEY = 'budget_user_id';
const USER_EMAIL_KEY = 'budget_user_email';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthControllerService);
  private readonly userApi = inject(AppUserControllerService);

  private readonly _isAuthenticated = signal(this.hasStoredToken());
  private readonly _userEmail = signal(this.getStoredEmail());
  private readonly _userId = signal(this.getStoredUserId());

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly userEmail = computed(() => this._userEmail());
  readonly userId = computed(() => this._userId());

  login(email: string, password: string): Observable<AuthResponseDTO> {
    return this.authApi.login({ email, password }).pipe(
      tap(response => this.storeSession(response))
    );
  }

  register(user: AppUserDTO): Observable<AuthResponseDTO> {
    return this.userApi.create(user).pipe(
      switchMap(() => this.login(user.email, user.password))
    );
  }

  logout(): void {
    this.authApi.logout().pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.clearSession();
      this.router.navigate(['/login']);
    });
  }

  refresh(): Observable<AuthResponseDTO> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return of({} as AuthResponseDTO);
    }
    return this.authApi.refresh({ refreshToken }).pipe(
      tap(response => this.storeSession(response)),
      catchError(() => {
        this.clearSession();
        return of({} as AuthResponseDTO);
      })
    );
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_KEY);
  }

  private storeSession(response: AuthResponseDTO): void {
    if (response.accessToken) {
      sessionStorage.setItem(TOKEN_KEY, response.accessToken);
    }
    if (response.refreshToken) {
      sessionStorage.setItem(REFRESH_KEY, response.refreshToken);
    }
    if (response.userId) {
      sessionStorage.setItem(USER_ID_KEY, response.userId);
    }
    if (response.email) {
      sessionStorage.setItem(USER_EMAIL_KEY, response.email);
    }
    this._isAuthenticated.set(true);
    this._userEmail.set(response.email ?? null);
    this._userId.set(response.userId ?? null);
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    this._isAuthenticated.set(false);
    this._userEmail.set(null);
    this._userId.set(null);
  }

  private hasStoredToken(): boolean {
    return !!sessionStorage.getItem(TOKEN_KEY);
  }

  private getStoredEmail(): string | null {
    return sessionStorage.getItem(USER_EMAIL_KEY);
  }

  private getStoredUserId(): string | null {
    return sessionStorage.getItem(USER_ID_KEY);
  }
}
