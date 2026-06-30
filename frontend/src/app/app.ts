import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { ThemeToggleComponent } from './layout/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, ThemeToggleComponent],
  template: `
    <app-header (menuToggle)="toggleMenu()" />
    <app-sidebar [open]="menuOpen()" (closed)="menuOpen.set(false)" />
    <router-outlet />
    <app-theme-toggle />
  `,
})
export class App {
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }
}
