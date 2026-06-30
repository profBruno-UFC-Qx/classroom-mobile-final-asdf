import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '@core/services/auth.service';
import { provideRouter } from '@angular/router';

class FakeAuthService {
  isAuthenticated = vi.fn();
}

describe('guestGuard', () => {
  let authServiceMock: FakeAuthService;
  let router: Router;

  function runGuard() {
    return TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
  }

  beforeEach(() => {
    authServiceMock = new FakeAuthService();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('allows unauthenticated users to access the route', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    expect(runGuard()).toBe(true);
  });

  it('redirects authenticated users to /dashboard', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    const result = runGuard();
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});
