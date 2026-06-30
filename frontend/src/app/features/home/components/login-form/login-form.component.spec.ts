import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('renders email and password inputs', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="email-input"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('[data-cy="password-input"]'))).toBeTruthy();
    });
  });

  describe('submit button state', () => {
    it('submit button is disabled while isLoading is true', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.detectChanges();
      const btn: HTMLButtonElement = fixture.debugElement.query(By.css('[data-cy="login-submit"]')).nativeElement;
      expect(btn.disabled).toBe(true);
    });

    it('submit button is enabled when form is valid and isLoading is false', () => {
      component.isLoading = false;
      component.form.setValue({ email: 'user@example.com', password: 'password123' });
      fixture.detectChanges();
      const btn: HTMLButtonElement = fixture.debugElement.query(By.css('[data-cy="login-submit"]')).nativeElement;
      expect(btn.disabled).toBe(false);
    });
  });

  describe('error display', () => {
    it('displays error message when error input is set', () => {
      fixture.componentRef.setInput('error', 'Invalid credentials');
      fixture.detectChanges();
      const alert = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(alert.nativeElement.textContent).toContain('Invalid credentials');
    });

    it('does not show error block when error is null', () => {
      component.error = null;
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('[role="alert"]'))).toBeNull();
    });
  });

  describe('form validation', () => {
    it('shows field-error when email is touched and empty', () => {
      component.form.controls.email.markAsTouched();
      fixture.detectChanges();
      const error = fixture.debugElement.query(By.css('.field-error'));
      expect(error).toBeTruthy();
      expect(error.nativeElement.textContent).toContain('Email is required');
    });

    it('shows field-error when email format is invalid', () => {
      component.form.controls.email.setValue('not-an-email');
      component.form.controls.email.markAsTouched();
      fixture.detectChanges();
      const error = fixture.debugElement.query(By.css('.field-error'));
      expect(error.nativeElement.textContent).toContain('valid email');
    });

    it('shows field-error when password is too short', () => {
      component.form.controls.password.setValue('short');
      component.form.controls.password.markAsTouched();
      fixture.detectChanges();
      const errors = fixture.debugElement.queryAll(By.css('.field-error'));
      const passwordError = errors[errors.length - 1];
      expect(passwordError.nativeElement.textContent).toContain('8 characters');
    });
  });

  describe('onSubmit', () => {
    it('does not emit loginSubmit when form is invalid', () => {
      const spy = vi.fn();
      component.loginSubmit.subscribe(spy);
      component.onSubmit();
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits loginSubmit with credentials when form is valid', () => {
      const spy = vi.fn();
      component.loginSubmit.subscribe(spy);
      component.form.setValue({ email: 'test@example.com', password: 'password123' });
      component.onSubmit();
      expect(spy).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    });
  });
});
