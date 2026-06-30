import { Component, inject, input, output } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { PrivateNavListComponent } from './private-nav-list/private-nav-list.component';
import { PublicNavListComponent } from './public-nav-list/public-nav-list.component';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  imports: [PrivateNavListComponent, PublicNavListComponent],
})
export class SidebarComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly authService = inject(AuthService);

  protected isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  close(): void {
    this.closed.emit();
  }
}
