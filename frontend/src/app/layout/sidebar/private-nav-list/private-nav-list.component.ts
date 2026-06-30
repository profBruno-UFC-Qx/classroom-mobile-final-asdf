import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-private-nav-list',
  templateUrl: './private-nav-list.component.html',
  styleUrl: './private-nav-list.component.scss',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
})
export class PrivateNavListComponent {
  readonly linkClicked = output<void>();
}
