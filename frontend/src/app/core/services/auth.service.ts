import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, map, finalize } from 'rxjs/operators';
import { LoginCredentials, RegisterCredentials, TokenPair } from '@core/models/user.model';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = `${environment.apiUrl}/api`;

  login(credentials: LoginCredentials): Observable<TokenPair> {
    return this.http.post<{ data: TokenPair }>(`${this.baseUrl}/auth/login`, credentials).pipe(
      map(res => res.data),
      tap(tokens => this.storeTokens(tokens)),
    );
  }

  register(credentials: RegisterCredentials): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/register`, credentials).pipe(
      map(() => void 0),
    );
  }

  renewToken(refreshToken: string): Observable<TokenPair> {
    return this.http.post<{ data: TokenPair }>(`${this.baseUrl}/auth/renew`, { refresh_token: refreshToken }).pipe(
      map(res => res.data),
      tap(tokens => this.storeTokens(tokens)),
    );
  }

  logout(): Observable<void> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<void>(
      `${this.baseUrl}/auth/logout`,
      refreshToken ? { refresh_token: refreshToken } : {}
    ).pipe(
      finalize(() => this.clearTokens()),
      map(() => void 0),
    );
  }

  clearTokens(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  private storeTokens(tokens: TokenPair): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
  }
}
