import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-public-nav-list',
  templateUrl: './public-nav-list.component.html',
  styleUrl: './public-nav-list.component.scss',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
})
export class PublicNavListComponent {
  readonly linkClicked = output<void>();
}
