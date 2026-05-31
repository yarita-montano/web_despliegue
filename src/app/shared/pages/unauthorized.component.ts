import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <div class="badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>
        <h1>Acceso restringido</h1>
        <p>No tienes permisos para entrar a esta sección. Vuelve al inicio o cambia de cuenta.</p>
        <button (click)="goBack()" class="btn btn-primary">
          Ir al inicio
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .unauthorized-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: var(--background, #f4f2ed);
        padding: 32px 20px;
        position: relative;
        overflow: hidden;
      }
      .unauthorized-container::before {
        content: '';
        position: absolute;
        width: 520px;
        height: 520px;
        top: -180px;
        right: -180px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(177, 29, 39, 0.08) 0%,
          rgba(177, 29, 39, 0) 70%
        );
        pointer-events: none;
      }
      .unauthorized-content {
        position: relative;
        background: var(--surface, #fff);
        padding: 44px 36px;
        border-radius: var(--radius-xl, 22px);
        border: 1px solid var(--border-subtle, #f0ede6);
        text-align: center;
        max-width: 420px;
        box-shadow: var(--shadow-lg, 0 16px 32px rgba(24, 24, 27, 0.08));
      }
      .badge {
        width: 56px;
        height: 56px;
        margin: 0 auto 18px;
        background: var(--brand-soft, #fce7e9);
        color: var(--brand, #b11d27);
        border-radius: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      h1 {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--ink, #18181b);
        margin: 0 0 8px;
      }
      p {
        font-size: 14.5px;
        line-height: 1.55;
        color: var(--ink-muted, #8a8a93);
        margin: 0 0 26px;
      }
      .btn {
        appearance: none;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        padding: 11px 22px;
        border-radius: 12px;
        cursor: pointer;
        border: 1px solid var(--brand, #b11d27);
        background: var(--brand, #b11d27);
        color: #fff;
        transition:
          background 180ms ease,
          transform 180ms ease,
          box-shadow 180ms ease;
      }
      .btn:hover {
        background: var(--brand-dark, #7c1419);
        border-color: var(--brand-dark, #7c1419);
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(177, 29, 39, 0.22);
      }
    `,
  ],
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
