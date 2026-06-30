import { Component, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslatePipe],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);
}
