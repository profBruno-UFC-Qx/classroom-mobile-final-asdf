import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginCredentials } from '@core/models/user.model';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
})
export class LoginFormComponent {
  @Input() isLoading = false;
  @Input() error: string | null = null;
  @Output() readonly loginSubmit = new EventEmitter<LoginCredentials>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loginSubmit.emit(this.form.getRawValue() as LoginCredentials);
  }
}
