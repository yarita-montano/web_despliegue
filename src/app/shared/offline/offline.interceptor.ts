import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, of, switchMap } from 'rxjs';
import { OutboxService } from './outbox.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const outbox = inject(OutboxService);

  // Los reportes IA (interpretar / ejecutar / exportar) NO deben encolarse en el
  // outbox: dependen de Gemini y de generar archivos en el backend, y un 202
  // sintetico daria una previsualizacion vacia o un blob corrupto. Offline => se
  // deja fallar con error de red claro (el componente avisa al usuario).
  if (req.url.includes('/admin/reportes/')) {
    return next(req);
  }

  if (!navigator.onLine) {
    if (MUTATING.has(req.method)) {
      const headers: Record<string, string> = {};
      req.headers.keys().forEach(k => {
        const value = req.headers.get(k);
        if (value) headers[k] = value;
      });

      return from(outbox.enqueue({
        method: req.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: req.urlWithParams,
        body: req.body,
        headers,
      })).pipe(
        switchMap(() => of(new HttpResponse({
          status: 202,
          body: { offline: true, queued: true, message: 'Encolado para sincronizar' },
        })))
      );
    }

    return of(new HttpResponse({ status: 204, body: null }));
  }

  return next(req);
};
