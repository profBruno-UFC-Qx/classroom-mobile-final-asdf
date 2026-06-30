import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { guestGuard } from '@core/guards/guest.guard';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    component: HomePageComponent,
    canActivate: [guestGuard],
  },
];
