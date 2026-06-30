import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-email-verified-page',
  imports: [TranslatePipe],
  templateUrl: './email-verified-page.component.html',
  styleUrl: './email-verified-page.component.scss',
})
export class EmailVerifiedPageComponent {
  private readonly router = inject(Router);

  goToSignIn(): void {
    this.router.navigate(['/']);
  }
}
