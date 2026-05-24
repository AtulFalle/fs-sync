import { Route } from '@angular/router';
import { GoogleDriveSyncPageComponent } from './pages/google-drive-sync-page/google-drive-sync-page.component';

export const GOOGLE_DRIVE_SYNC_ROUTES: Route[] = [
  {
    path: '',
    component: GoogleDriveSyncPageComponent,
  },
];
