import { ApplicationConfig, APP_INITIALIZER, inject, isDevMode, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { RealtimeService } from './shared/services/realtime.service';
import { offlineInterceptor } from './shared/offline/offline.interceptor';

function initRealtime() {
  return () => {
    const rt = inject(RealtimeService);
    const token = localStorage.getItem('access_token');
    if (token) rt.connect(token);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([offlineInterceptor])),
    { provide: APP_INITIALIZER, useFactory: initRealtime, multi: true },
    // PWA: registra ngsw-worker.js solo en build production
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
