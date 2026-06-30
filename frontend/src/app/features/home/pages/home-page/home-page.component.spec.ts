import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { HomePageComponent } from './home-page.component';
import { AuthService } from '@core/services/auth.service';
import { TranslationService } from '@core/services/translation.service';
import { TokenPair } from '@core/models/user.model';

class FakeAuthService {
  login = vi.fn();
  register = vi.fn();
}

class FakeRouter {
  navigate = vi.fn();
}

class FakeTranslationService {
  translate = (key: string) => key;
}

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let component: HomePageComponent;
  let authServiceMock: FakeAuthService;
  let routerMock: FakeRouter;

  const mockTokens: TokenPair = { access_token: 'access.jwt', refresh_token: 'refresh.jwt' };

  beforeEach(async () => {
    authServiceMock = new FakeAuthService();
    routerMock = new FakeRouter();

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: TranslationService, useValue: new FakeTranslationService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the login form', () => {
    expect(fixture.debugElement.query(By.css('app-login-form'))).toBeTruthy();
  });

  describe('onLoginSubmit', () => {
    it('calls authService.login with the submitted credentials', () => {
      authServiceMock.login.mockReturnValue(of(mockTokens));

      component.onLoginSubmit({ email: 'user@example.com', password: 'password123' });

      expect(authServiceMock.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });

    it('redirects to /dashboard after a successful login', () => {
      authServiceMock.login.mockReturnValue(of(mockTokens));

      component.onLoginSubmit({ email: 'user@example.com', password: 'password123' });

      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('sets isLoading to false after a successful login', () => {
      authServiceMock.login.mockReturnValue(of(mockTokens));

      component.onLoginSubmit({ email: 'user@example.com', password: 'password123' });

      expect(component.isLoading()).toBe(false);
    });

    it('does not redirect on login failure', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => ({ error: { error: 'Invalid credentials' } })),
      );

      component.onLoginSubmit({ email: 'user@example.com', password: 'wrongpassword' });

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('sets error message on login failure', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => ({ error: { error: 'Invalid credentials' } })),
      );

      component.onLoginSubmit({ email: 'user@example.com', password: 'wrongpassword' });

      expect(component.error()).toBe('Invalid credentials');
      expect(component.isLoading()).toBe(false);
    });

    it('falls back to translation key when server provides no error on login', () => {
      authServiceMock.login.mockReturnValue(throwError(() => ({})));

      component.onLoginSubmit({ email: 'user@example.com', password: 'wrongpassword' });

      expect(component.error()).toBe('home.form.error');
    });

    it('clears a previous error before each new login attempt', () => {
      authServiceMock.login.mockReturnValue(
        throwError(() => ({ error: { error: 'First error' } })),
      );
      component.onLoginSubmit({ email: 'user@example.com', password: 'wrongpassword' });
      expect(component.error()).toBe('First error');

      authServiceMock.login.mockReturnValue(of(mockTokens));
      component.onLoginSubmit({ email: 'user@example.com', password: 'password123' });

      expect(component.error()).toBeNull();
    });
  });

  describe('onSignupSubmit', () => {
    it('shows verification modal after successful registration', () => {
      authServiceMock.register.mockReturnValue(of(void 0));

      component.onSignupSubmit({ email: 'new@example.com', password: 'password123' });

      expect(component.showVerificationModal()).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('does not store tokens or navigate to dashboard after registration', () => {
      authServiceMock.register.mockReturnValue(of(void 0));

      component.onSignupSubmit({ email: 'new@example.com', password: 'password123' });

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('sets error on registration failure', () => {
      authServiceMock.register.mockReturnValue(
        throwError(() => ({ error: { error: 'email already in use' } })),
      );

      component.onSignupSubmit({ email: 'taken@example.com', password: 'password123' });

      expect(component.error()).toBe('email already in use');
      expect(component.showVerificationModal()).toBe(false);
    });
  });

  describe('onVerificationModalClose', () => {
    it('closes modal and switches to login mode', () => {
      component.showVerificationModal.set(true);
      component.setMode('signup');

      component.onVerificationModalClose();

      expect(component.showVerificationModal()).toBe(false);
      expect(component.mode()).toBe('login');
    });
  });
});
