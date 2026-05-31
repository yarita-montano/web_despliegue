import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { OutboxService } from './outbox.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!online" class="banner offline">
      ⚠️ Sin conexion — {{ pending }} accion(es) en cola
    </div>
    <div *ngIf="online && pending > 0" class="banner syncing">
      🔄 Sincronizando {{ pending }} accion(es) pendientes...
    </div>
  `,
  styles: [
    '.banner { padding: 8px; text-align: center; color: white; font-weight: 600; }',
    '.offline { background: #dc3545; }',
    '.syncing { background: #f39c12; }',
  ],
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  private outbox = inject(OutboxService);

  online = navigator.onLine;
  pending = 0;
  private sub?: Subscription;

  ngOnInit(): void {
    window.addEventListener('online', this.setOnline);
    window.addEventListener('offline', this.setOffline);
    this.sub = this.outbox.pendingCount$.subscribe(n => (this.pending = n));
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.setOnline);
    window.removeEventListener('offline', this.setOffline);
    this.sub?.unsubscribe();
  }

  private setOnline = (): void => {
    this.online = true;
    this.outbox.drain();
  };

  private setOffline = (): void => {
    this.online = false;
  };
}
