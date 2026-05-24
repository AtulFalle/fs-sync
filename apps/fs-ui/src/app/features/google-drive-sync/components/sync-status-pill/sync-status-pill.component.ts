import { Component, computed, input } from '@angular/core';

type SyncStatus =
  | 'active'
  | 'expired'
  | 'error'
  | 'disabled'
  | 'stored'
  | 'queued'
  | 'failed'
  | 'deleted'
  | string
  | null
  | undefined;

@Component({
  selector: 'app-sync-status-pill',
  standalone: true,
  templateUrl: './sync-status-pill.component.html',
  styleUrl: './sync-status-pill.component.scss',
})
export class SyncStatusPillComponent {
  readonly status = input<SyncStatus>();

  protected readonly statusLabel = computed(() =>
    (this.status() ?? 'default').replace(/_/g, ' '),
  );

  protected readonly statusClass = computed(() => {
    const value = this.status() ?? 'default';
    const supported = [
      'active',
      'expired',
      'error',
      'disabled',
      'stored',
      'queued',
      'failed',
      'deleted',
    ];

    return supported.includes(value) ? value : 'default';
  });
}
