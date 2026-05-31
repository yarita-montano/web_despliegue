import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../shared/services/http.service';

export interface CategoriaCount {
  codigo: string | null;
  nombre: string;
  total: number;
}

export interface ZonaKpi {
  lat: number;
  lng: number;
  total: number;
}

export interface SlaKpi {
  total_completadas: number;
  cumplen_sla: number;
  porcentaje: number;
  sla_minutos: number;
}

export interface KpiResumen {
  desde: string;
  hasta: string;
  tiempo_promedio_asignacion_min: number;
  tiempo_promedio_llegada_min: number;
  incidentes_por_categoria: CategoriaCount[];
  casos_cancelados: number;
  zonas_mas_incidentes: ZonaKpi[];
  sla_cumplimiento: SlaKpi | null;
}

@Injectable({ providedIn: 'root' })
export class KpisService {
  private http = inject(HttpService);

  resumen(desde?: string, hasta?: string): Observable<KpiResumen> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    const qs = params.toString();
    return this.http.get<KpiResumen>(`/tenants/me/kpis${qs ? '?' + qs : ''}`);
  }
}
