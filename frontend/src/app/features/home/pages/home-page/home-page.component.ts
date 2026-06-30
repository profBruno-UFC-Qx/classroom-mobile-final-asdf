import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { TranslationService } from '@core/services/translation.service';
import { LoginCredentials, RegisterCredentials } from '@core/models/user.model';
import { LoginFormComponent } from '../../components/login-form/login-form.component';
import { SignupFormComponent } from '../../components/signup-form/signup-form.component';
import { EmailVerificationModalComponent } from '../../components/email-verification-modal/email-verification-modal.component';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-home-page',
  imports: [LoginFormComponent, SignupFormComponent, EmailVerificationModalComponent, TranslatePipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly authService = inject(AuthService);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);

  readonly mode = signal<'login' | 'signup'>('login');
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showVerificationModal = signal(false);

  setMode(mode: 'login' | 'signup'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  onLoginSubmit(credentials: LoginCredentials): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.error.set(err.error?.error ?? this.translationService.translate('home.form.error'));
      },
    });
  }

  onSignupSubmit(credentials: RegisterCredentials): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.authService.register(credentials).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.showVerificationModal.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.error.set(err.error?.error ?? this.translationService.translate('home.signupForm.error'));
      },
    });
  }

  onVerificationModalClose(): void {
    this.showVerificationModal.set(false);
    this.setMode('login');
  }
}
