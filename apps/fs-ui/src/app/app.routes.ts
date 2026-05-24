import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'google-drive-sync',
    loadChildren: () =>
      import('./features/google-drive-sync/google-drive-sync.routes').then(
        (m) => m.GOOGLE_DRIVE_SYNC_ROUTES,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'google-drive-sync',
  },
];
