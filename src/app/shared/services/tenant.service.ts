import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicTenant {
  id_tenant: number;
  slug: string;
  nombre: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Detecta el slug del tenant a partir del subdominio actual.
   *
   * Regla:
   *   - taller-excelente.midominio.space  -> 'taller-excelente'
   *   - midominio.space (apex)            -> null  (portal admin)
   *   - www / api / app / etc.            -> null
   *   - localhost / IP                    -> null  (salvo override)
   *
   * Override de desarrollo: ?tenant=slug en la URL (para probar en localhost
   * o en el apex sin tener que montar el subdominio).
   */
  static detectSlug(): string | null {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('tenant');
    if (override) return override.trim().toLowerCase();

    const host = window.location.hostname; // sin puerto
    if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

    const parts = host.split('.');
    if (parts.length < 3) return null; // apex (dominio.tld) -> admin

    const sub = parts[0].toLowerCase();
    const reservados = ['www', 'api', 'admin', 'app', 'dashboard', 'webdespliegue'];
    if (reservados.includes(sub)) return null;
    return sub;
  }

  /** Resuelve la info pública de un tenant por su slug/subdominio. */
  getBySlug(slug: string): Observable<PublicTenant> {
    return this.http.get<PublicTenant>(
      `${this.baseUrl}/tenants/by-slug/${encodeURIComponent(slug)}`
    );
  }
}
