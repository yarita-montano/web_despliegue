import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { localDB, OutboxItem } from './local-db';

@Injectable({ providedIn: 'root' })
export class OutboxService {
  readonly pendingCount$ = new BehaviorSubject<number>(0);
  private syncing = false;

  constructor() {
    this.refreshCount();
    window.addEventListener('online', () => this.drain());
  }

  async enqueue(
    item: Omit<OutboxItem, 'id' | 'created_at' | 'attempts' | 'client_id'>
  ): Promise<string> {
    const client_id = crypto.randomUUID();
    await localDB.outbox.add({
      ...item,
      client_id,
      created_at: new Date().toISOString(),
      attempts: 0,
    });
    this.refreshCount();
    return client_id;
  }

  async drain(maxAttempts = 5): Promise<void> {
    if (this.syncing || !navigator.onLine) return;
    this.syncing = true;

    try {
      const items = await localDB.outbox.orderBy('created_at').toArray();
      for (const item of items) {
        try {
          const resp = await fetch(item.url, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Id': item.client_id,
              ...(item.headers || {}),
            },
            body: item.body ? JSON.stringify(item.body) : undefined,
          });

          if (resp.ok) {
            await localDB.outbox.delete(item.id!);
          } else if (resp.status >= 400 && resp.status < 500) {
            await localDB.outbox.delete(item.id!);
          } else {
            await localDB.outbox.update(item.id!, {
              attempts: item.attempts + 1,
              last_error: `HTTP ${resp.status}`,
            });
            if (item.attempts + 1 >= maxAttempts) {
              await localDB.outbox.delete(item.id!);
            }
          }
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'network error';
          await localDB.outbox.update(item.id!, {
            attempts: item.attempts + 1,
            last_error: message,
          });
        }
      }
    } finally {
      this.syncing = false;
      this.refreshCount();
    }
  }

  private async refreshCount(): Promise<void> {
    this.pendingCount$.next(await localDB.outbox.count());
  }
}
