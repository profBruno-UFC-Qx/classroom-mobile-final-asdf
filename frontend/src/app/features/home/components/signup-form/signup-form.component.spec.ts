import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SignupFormComponent } from './signup-form.component';
import { TranslationService } from '@core/services/translation.service';

class FakeTranslationService {
  translate = (key: string) => key;
}

describe('SignupFormComponent', () => {
  let fixture: ComponentFixture<SignupFormComponent>;
  let component: SignupFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupFormComponent],
      providers: [
        { provide: TranslationService, useValue: new FakeTranslationService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('renders email, password, and confirm password fields', () => {
      expect(fixture.debugElement.query(By.css('[data-cy="signup-email-input"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('[data-cy="signup-password-input"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('[data-cy="signup-confirm-password-input"]'))).toBeTruthy();
    });
  });

  describe('submit button state', () => {
    it('submit button is disabled when form is empty', () => {
      const btn = fixture.debugElement.query(By.css('[data-cy="signup-submit"]')).nativeElement as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('submit button is disabled when passwords do not match', () => {
      component.form.setValue({ email: 'test@example.com', password: 'password123', confirmPassword: 'different' });
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('[data-cy="signup-submit"]')).nativeElement as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    it('shows password mismatch error when passwords differ and confirmPassword is touched', () => {
      component.form.setValue({ email: 'test@example.com', password: 'password123', confirmPassword: 'different' });
      component.form.controls.confirmPassword.markAsTouched();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[data-cy="password-mismatch-error"]'))).toBeTruthy();
    });

    it('does not show mismatch error when passwords match', () => {
      component.form.setValue({ email: 'test@example.com', password: 'password123', confirmPassword: 'password123' });
      component.form.controls.confirmPassword.markAsTouched();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[data-cy="password-mismatch-error"]'))).toBeNull();
    });
  });

  describe('onSubmit', () => {
    it('emits signupSubmit with email and password when form is valid', () => {
      const emitted: { email: string; password: string }[] = [];
      component.signupSubmit.subscribe(v => emitted.push(v));

      component.form.setValue({ email: 'test@example.com', password: 'password123', confirmPassword: 'password123' });
      fixture.detectChanges();
      component.onSubmit();

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual({ email: 'test@example.com', password: 'password123' });
    });
  });
});
