import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RealtimeService } from '../services/realtime.service';

@Component({
  selector: 'app-connection-badge',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <span class="conn-badge" [class]="(rt.state$ | async)">
      <span class="conn-dot"></span>
      {{ stateLabel(rt.state$ | async) }}
    </span>
  `,
  styles: [
    `
      .conn-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.02em;
        background: var(--overlay, #f0ede6);
        color: var(--ink-subtle, #52525b);
        border: 1px solid var(--border-subtle, #f0ede6);
      }
      .conn-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.7;
      }
      .conn-badge.connected {
        background: var(--success-soft, #dcfce7);
        color: var(--success-ink, #14532d);
        border-color: rgba(21, 128, 61, 0.25);
      }
      .conn-badge.connected .conn-dot {
        background: #22c55e;
        opacity: 1;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
      }
      .conn-badge.connecting,
      .conn-badge.reconnecting {
        background: var(--warning-soft, #fef3c7);
        color: var(--warning-ink, #7c2d12);
        border-color: rgba(180, 83, 9, 0.25);
      }
      .conn-badge.connecting .conn-dot,
      .conn-badge.reconnecting .conn-dot {
        background: var(--warning, #b45309);
        animation: pulse 1.2s ease-out infinite;
      }
      .conn-badge.disconnected {
        background: var(--overlay, #f0ede6);
        color: var(--ink-muted, #8a8a93);
        border-color: var(--border-subtle, #f0ede6);
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.35;
        }
      }
    `,
  ],
})
export class ConnectionBadgeComponent {
  rt = inject(RealtimeService);

  stateLabel(s: string | null): string {
    return (
      {
        connected: 'En vivo',
        connecting: 'Conectando…',
        reconnecting: 'Reconectando…',
        disconnected: 'Sin conexión',
      }[s ?? 'disconnected'] ?? 'Sin conexión'
    );
  }
}
