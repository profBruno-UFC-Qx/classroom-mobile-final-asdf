import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { LoginCredentials, TokenPair } from '@core/models/user.model';
import { environment } from '@env';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login()', () => {
    const credentials: LoginCredentials = { email: 'test@example.com', password: 'password123' };
    const mockTokens: TokenPair = { access_token: 'access.jwt', refresh_token: 'refresh.jwt' };

    it('POSTs credentials to /api/auth/login and returns a TokenPair', () => {
      let result: TokenPair | undefined;

      service.login(credentials).subscribe(tokens => (result = tokens));

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush({ data: mockTokens });

      expect(result).toEqual(mockTokens);
    });

    it('stores tokens in localStorage after successful login', () => {
      service.login(credentials).subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/login`);
      req.flush({ data: mockTokens });

      expect(localStorage.getItem('access_token')).toBe('access.jwt');
      expect(localStorage.getItem('refresh_token')).toBe('refresh.jwt');
    });
  });

  describe('token management', () => {
    it('getToken returns the stored access token', () => {
      localStorage.setItem('access_token', 'my.jwt');
      expect(service.getToken()).toBe('my.jwt');
    });

    it('isAuthenticated returns true when token exists', () => {
      localStorage.setItem('access_token', 'my.jwt');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated returns false when no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('getRefreshToken returns the stored refresh token', () => {
      localStorage.setItem('refresh_token', 'my.refresh');
      expect(service.getRefreshToken()).toBe('my.refresh');
    });

    it('getRefreshToken returns null when no token is stored', () => {
      expect(service.getRefreshToken()).toBeNull();
    });
  });

  describe('renewToken()', () => {
    const mockTokens: TokenPair = { access_token: 'new.access', refresh_token: 'new.refresh' };

    it('POSTs to /api/auth/renew and returns a TokenPair', () => {
      let result: TokenPair | undefined;

      service.renewToken('old.refresh').subscribe(tokens => (result = tokens));

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/renew`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refresh_token: 'old.refresh' });
      req.flush({ data: mockTokens });

      expect(result).toEqual(mockTokens);
    });

    it('stores new tokens in localStorage on success', () => {
      service.renewToken('old.refresh').subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/renew`);
      req.flush({ data: mockTokens });

      expect(localStorage.getItem('access_token')).toBe('new.access');
      expect(localStorage.getItem('refresh_token')).toBe('new.refresh');
    });
  });

  describe('logout()', () => {
    it('POSTs to /api/auth/logout with the stored refresh token', () => {
      localStorage.setItem('access_token', 'my.jwt');
      localStorage.setItem('refresh_token', 'my.refresh');

      service.logout().subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refresh_token: 'my.refresh' });
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('clears localStorage after a successful logout', () => {
      localStorage.setItem('access_token', 'my.jwt');
      localStorage.setItem('refresh_token', 'my.refresh');

      service.logout().subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/logout`);
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('clears localStorage even when the HTTP call fails', () => {
      localStorage.setItem('access_token', 'my.jwt');
      localStorage.setItem('refresh_token', 'my.refresh');

      service.logout().subscribe({ error: () => {} });

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/logout`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('POSTs an empty body when no refresh token is stored', () => {
      localStorage.setItem('access_token', 'my.jwt');

      service.logout().subscribe();

      const req = httpTesting.expectOne(`${environment.apiUrl}/api/auth/logout`);
      expect(req.request.body).toEqual({});
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
