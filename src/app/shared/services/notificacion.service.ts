import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Observable } from 'rxjs';
import type { MessagePayload } from 'firebase/messaging';

export interface Notificacion {
  id_notificacion: number;
  id_usuario?: number;
  id_taller?: number;
  id_incidente?: number;
  titulo: string;
  mensaje: string;
  leido: boolean;
  enviado_push: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private _messaging: any = null;
  private _firebaseInitialized = false;

  constructor(private http: HttpService) {}

  // ── REST API ────────────────────────────────────────────────────────────────

  getMisNotificaciones(soloNoLeidas = false): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(
      `/notificaciones/taller?solo_no_leidas=${soloNoLeidas}`
    );
  }

  marcarLeida(idNotificacion: number): Observable<void> {
    return this.http.put<void>(
      `/notificaciones/taller/${idNotificacion}/leer`,
      {}
    );
  }

  registrarPushToken(token: string): Observable<void> {
    return this.http.post<void>('/notificaciones/taller/push-token', {
      push_token: token,
    });
  }

  // ── Firebase FCM ────────────────────────────────────────────────────────────

  async initFirebase(): Promise<void> {
    if (this._firebaseInitialized) return;

    try {
      const { environment } = await import('../../../environments/environment');

      // En desarrollo, evita fallar si aún no se configuró Firebase real.
      const cfg = environment.firebase as Record<string, string>;
      const vapidKey = cfg['vapidKey'] ?? '';
      const hasPlaceholders =
        !cfg['apiKey'] ||
        !cfg['appId'] ||
        !vapidKey ||
        cfg['apiKey'].includes('REEMPLAZAR_') ||
        cfg['appId'].includes('REEMPLAZAR_') ||
        vapidKey.includes('REEMPLAZAR_');

      if (hasPlaceholders) {
        console.info('[FCM] Firebase no configurado (placeholders detectados). Se omite init de messaging.');
        return;
      }

      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import(
        'firebase/messaging'
      );

      const app = initializeApp(environment.firebase);
      this._messaging = getMessaging(app);
      this._firebaseInitialized = true;

      // Solicitar permiso y registrar token
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this._messaging, {
          vapidKey,
        });
        if (token) {
          this.registrarPushToken(token).subscribe();
        }
      }

      // Notificaciones en foreground
      onMessage(this._messaging, (payload: MessagePayload) => {
        const { title, body } = payload.notification ?? {};
        if (title) {
          new Notification(title, { body: body ?? '' });
        }
      });
    } catch (err) {
      console.warn('[FCM] No se pudo inicializar Firebase Messaging:', err);
    }
  }
}
