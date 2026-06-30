import { Routes } from '@angular/router';
import { HOME_ROUTES } from '@features/home/home.routes';
import { authGuard } from '@core/guards/auth.guard';

// Home is eager-loaded (prerendered). All other features use loadChildren for lazy loading.
export const routes: Routes = [
  ...HOME_ROUTES,
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('@features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
  },
  {
    path: 'email-verified',
    loadChildren: () => import('@features/email-verified/email-verified.routes').then(m => m.EMAIL_VERIFIED_ROUTES),
  },
];
