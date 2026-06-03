import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../shared/services/http.service';

export interface AsignacionCancelada {
  id_asignacion: number;
  id_incidente: number;
  cancelada_at?: string;
  cancelada_por?: string;
  motivo_cancelacion?: string;
  compensacion_monto?: number;
  compensacion_pagada: boolean;
}

export interface TenantCancelacionConfig {
  pct_cancel_pendiente: number;
  pct_cancel_aceptada: number;
  pct_cancel_en_camino: number;
}

@Injectable({ providedIn: 'root' })
export class CancelacionesService {
  private http = inject(HttpService);

  misCanceladas(): Observable<AsignacionCancelada[]> {
    return this.http.get<AsignacionCancelada[]>('/talleres/mi-taller/asignaciones?estado=cancelada');
  }

  miTenant(): Observable<TenantCancelacionConfig> {
    return this.http.get<TenantCancelacionConfig>('/tenants/me');
  }

  actualizarPorcentajes(config: TenantCancelacionConfig): Observable<TenantCancelacionConfig> {
    return this.http.patch<TenantCancelacionConfig>(
      '/tenants/me/cancelacion-pct',
      config,
    );
  }
}
