import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WSEvent {
  event: string;
  data?: unknown;
  channel?: string;
  channels?: string[];
  identity?: { tipo: string; sub_id: number };
  detail?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private ws?: WebSocket;
  private token?: string;
  private wsBase = environment.wsBase;

  private reconnectAttempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private subscribedChannels = new Set<string>();

  readonly events$ = new Subject<WSEvent>();
  readonly state$ = new BehaviorSubject<ConnectionState>('disconnected');

  connect(token: string): void {
    this.token = token;
    this.disposed = false;
    this._connect();
  }

  disconnect(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.subscribedChannels.clear();
    this.state$.next('disconnected');
  }

  subscribe(channel: string): void {
    this.subscribedChannels.add(channel);
    this._send({ action: 'subscribe', channel });
  }

  unsubscribe(channel: string): void {
    this.subscribedChannels.delete(channel);
    this._send({ action: 'unsubscribe', channel });
  }

  ping(): void {
    this._send({ action: 'ping' });
  }

  private _connect(): void {
    if (!this.token || this.disposed) return;

    this.state$.next(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting');

    const url = `${this.wsBase}/ws?token=${encodeURIComponent(this.token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.reconnectAttempts = 0;
      this.state$.next('connected');
      for (const ch of this.subscribedChannels) {
        this._send({ action: 'subscribe', channel: ch });
      }
    };

    ws.onmessage = (e) => {
      if (this.ws !== ws) return;
      try {
        const msg: WSEvent = JSON.parse(e.data);
        this.events$.next(msg);
      } catch {
        console.error('WS message no parseable', e.data);
      }
    };

    ws.onerror = (e) => {
      if (this.ws !== ws) return;
      console.warn('WS error', e);
    };

    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = undefined;
      this.state$.next('disconnected');
      if (this.disposed) return;

      if (e.code === 1008) {
        console.error('WS auth fallo - token invalido. No reintento.');
        return;
      }
      this._scheduleReconnect();
    };
  }

  private _scheduleReconnect(): void {
    const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;
    this.state$.next('reconnecting');
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  private _send(payload: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
