import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineBannerComponent } from './shared/offline/offline-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OfflineBannerComponent],
  template: `
    <app-offline-banner />
    <router-outlet />
  `,
  styleUrl: './app.scss',
})
export class App {}
