import { HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const PUBLIC_URLS = [
  '/api/auth/login',
  '/api/auth/refresh',
];

function isPublicUrl(url: string, method: string): boolean {
  if (PUBLIC_URLS.some(publicUrl => url.includes(publicUrl))) {
    return true;
  }
  // POST /api/users is the registration endpoint
  if (url.includes('/api/users') && method === 'POST') {
    return true;
  }
  return false;
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isPublicUrl(req.url, req.method)) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if ((error.status === 401 || error.status === 403) && token && !req.url.includes('/api/auth/refresh')) {
        return authService.refresh().pipe(
          switchMap(response => {
            if (response.accessToken) {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${response.accessToken}` }
              });
              return next(retryReq);
            }
            authService.clearSession();
            router.navigate(['/login']);
            return throwError(() => error);
          }),
          catchError(() => {
            authService.clearSession();
            router.navigate(['/login']);
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
