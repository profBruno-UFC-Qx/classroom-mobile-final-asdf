import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '@core/services/auth.service';
import { TokenPair } from '@core/models/user.model';
import { environment } from '@env';

class FakeAuthService {
  getToken = vi.fn();
  getRefreshToken = vi.fn();
  renewToken = vi.fn();
  clearTokens = vi.fn();
}

class FakeRouter {
  navigate = vi.fn().mockResolvedValue(true);
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authServiceMock: FakeAuthService;
  let routerMock: FakeRouter;

  const apiUrl = `${environment.apiUrl}/api/test`;
  const renewUrl = `${environment.apiUrl}/api/auth/renew`;
  const logoutUrl = `${environment.apiUrl}/api/auth/logout`;

  beforeEach(() => {
    authServiceMock = new FakeAuthService();
    routerMock = new FakeRouter();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('attaches Authorization header when a token is present', () => {
    authServiceMock.getToken.mockReturnValue('my.access.token');

    http.get(apiUrl).subscribe();

    const req = httpTesting.expectOne(apiUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my.access.token');
    req.flush({});
  });

  it('does not attach Authorization header when no token', () => {
    authServiceMock.getToken.mockReturnValue(null);

    http.get(apiUrl).subscribe();

    const req = httpTesting.expectOne(apiUrl);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('retries the original request with a new token on 401', () => {
    const newTokens: TokenPair = { access_token: 'new.access', refresh_token: 'new.refresh' };
    authServiceMock.getToken.mockReturnValue('expired.token');
    authServiceMock.getRefreshToken.mockReturnValue('valid.refresh');
    authServiceMock.renewToken.mockReturnValue(of(newTokens));

    let responseData: unknown;
    http.get(apiUrl).subscribe(data => (responseData = data));

    // First request returns 401.
    const firstReq = httpTesting.expectOne(apiUrl);
    firstReq.flush({ error: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Retried request succeeds with new token.
    const retryReq = httpTesting.expectOne(apiUrl);
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new.access');
    retryReq.flush({ data: 'ok' });

    expect(responseData).toEqual({ data: 'ok' });
  });

  it('calls clearTokens and navigates to / when renewal fails', () => {
    authServiceMock.getToken.mockReturnValue('expired.token');
    authServiceMock.getRefreshToken.mockReturnValue('invalid.refresh');
    authServiceMock.renewToken.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );

    let errorOccurred = false;
    http.get(apiUrl).subscribe({ error: () => (errorOccurred = true) });

    const req = httpTesting.expectOne(apiUrl);
    req.flush({ error: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorOccurred).toBe(true);
    expect(authServiceMock.clearTokens).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('calls clearTokens and navigates to / when no refresh token is stored', () => {
    authServiceMock.getToken.mockReturnValue('expired.token');
    authServiceMock.getRefreshToken.mockReturnValue(null);

    let errorOccurred = false;
    http.get(apiUrl).subscribe({ error: () => (errorOccurred = true) });

    const req = httpTesting.expectOne(apiUrl);
    req.flush({ error: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorOccurred).toBe(true);
    expect(authServiceMock.clearTokens).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('calls clearTokens and navigates to / when the renew endpoint itself returns 401', () => {
    authServiceMock.getToken.mockReturnValue('expired.token');

    let errorOccurred = false;
    http.get(renewUrl).subscribe({ error: () => (errorOccurred = true) });

    const req = httpTesting.expectOne(renewUrl);
    req.flush({ error: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorOccurred).toBe(true);
    expect(authServiceMock.clearTokens).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('calls clearTokens and navigates to / when the logout endpoint returns 401', () => {
    authServiceMock.getToken.mockReturnValue('expired.token');

    let errorOccurred = false;
    http.post(logoutUrl, {}).subscribe({ error: () => (errorOccurred = true) });

    const req = httpTesting.expectOne(logoutUrl);
    req.flush({ error: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorOccurred).toBe(true);
    expect(authServiceMock.clearTokens).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
