import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly theme = signal<Theme>('light');

  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const saved = localStorage.getItem('theme') as Theme | null;
    const preferred: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    this.theme.set(saved ?? preferred);

    effect(() => {
      const dark = this.isDark();
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.classList.toggle('light', !dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }
}
