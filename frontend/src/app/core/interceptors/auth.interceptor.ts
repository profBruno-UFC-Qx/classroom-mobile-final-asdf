import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { environment } from '@env';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(addAuthHeader(req, authService)).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401(req, next, authService, router, error);
      }
      return throwError(() => error);
    }),
  );
};

function addAuthHeader(req: HttpRequest<unknown>, authService: AuthService): HttpRequest<unknown> {
  const token = authService.getToken();
  if (token && req.url.startsWith(environment.apiUrl)) {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return req;
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  originalError: HttpErrorResponse,
) {
  // Avoid infinite loop on the renew endpoint, and skip refresh on logout (tokens may already be invalid).
  if (req.url.includes('/api/auth/renew') || req.url.includes('/api/auth/logout')) {
    authService.clearTokens();
    router.navigate(['/']);
    return throwError(() => originalError);
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      isRefreshing = false;
      authService.clearTokens();
      router.navigate(['/']);
      return throwError(() => originalError);
    }

    return authService.renewToken(refreshToken).pipe(
      switchMap(tokens => {
        isRefreshing = false;
        refreshSubject.next(tokens.access_token);
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${tokens.access_token}` } }));
      }),
      catchError(renewError => {
        isRefreshing = false;
        authService.clearTokens();
        router.navigate(['/']);
        return throwError(() => renewError);
      }),
    );
  }

  // Another request is already refreshing — wait for the new token and retry.
  return refreshSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
    ),
  );
}
