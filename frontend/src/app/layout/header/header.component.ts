import { Component, ElementRef, HostListener, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService, Language } from '@core/services/translation.service';
import { AuthService } from '@core/services/auth.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [TranslatePipe],
})
export class HeaderComponent {
  protected readonly translationService = inject(TranslationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly menuToggle = output<void>();
  readonly userMenuOpen = signal(false);

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onLangChange(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value as Language;
    this.translationService.setLanguage(lang);
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen.update(v => !v);
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/'])
    });
  }

  @HostListener('document:click')
  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }
}
