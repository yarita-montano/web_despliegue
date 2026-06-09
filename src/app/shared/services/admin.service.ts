import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpService } from './http.service';

// Interfaces que coinciden con los schemas del backend

export interface TallerAdmin {
  id_taller: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  capacidad_max: number;
  activo: boolean;
  verificado: boolean;
  disponible: boolean;
  created_at: string;
  updated_at: string;
}

export interface TallerAdminStats extends TallerAdmin {
  promedio_estrellas?: number | null;
  total_evaluaciones: number;
  total_servicios_completados: number;
  comision_total_generada: number;
  monto_total_procesado: number;
}

// Respuesta al registrar un taller: incluye su tenant + slug (= subdominio)
export interface TallerCreado extends TallerAdmin {
  id_tenant: number;
  slug: string;
}

export interface CategoriaAdmin {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
}

export interface TallerAdminCreate {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  capacidad_max?: number;
  verificado?: boolean;
  categorias: number[];
}

// Fila de ganancias mensuales (backend: GananciaMensualRow)
export interface GananciaMensualRow {
  anio: number;
  mes: number;
  nombre_mes: string;
  total_pagos: number;
  monto_total_procesado: number;
  comision_plataforma: number;
}

// Wrapper que devuelve el backend en /admin/ganancias/mensual
interface GananciaMensualResponse {
  filas: GananciaMensualRow[];
  total_comision: number;
  total_monto_procesado: number;
}

// Fila por taller (backend: GananciaTallerRow)
export interface GananciaTallerRow {
  id_taller: number;
  nombre_taller: string;
  email: string;
  verificado: boolean;
  activo: boolean;
  total_pagos: number;
  monto_total: number;
  comision_plataforma: number;
  promedio_estrellas?: number | null;
  total_evaluaciones: number;
}

// Wrapper que devuelve el backend en /admin/ganancias/por-taller
interface GananciaPorTallerResponse {
  filas: GananciaTallerRow[];
  total_comision: number;
  total_monto: number;
  filtro_anio?: number | null;
  filtro_mes?: number | null;
}

// Configuracion global de la plataforma (backend: ConfiguracionResponse)
export interface ConfiguracionGlobal {
  comision_plataforma_pct: number;
}

// KPIs (backend: kpi_schema)

export interface KpiCategoria {
  codigo: string | null;
  nombre: string;
  total: number;
}

export interface KpiZona {
  lat: number;
  lng: number;
  total: number;
}

export interface KpiSla {
  total_completadas: number;
  cumplen_sla: number;
  porcentaje: number;
  sla_minutos: number;
}

export interface KpiResumenAdmin {
  desde: string;
  hasta: string;
  tiempo_promedio_asignacion_min: number;
  tiempo_promedio_llegada_min: number;
  incidentes_por_categoria: KpiCategoria[];
  casos_cancelados: number;
  total_incidentes: number;
  zonas_mas_incidentes: KpiZona[];
  sla_cumplimiento: KpiSla | null;
}

export interface TallerKpiRow {
  id_taller: number;
  id_tenant: number | null;
  nombre: string;
  tiempo_asignacion_min: number;
  tiempo_llegada_min: number;
  total_incidentes: number;
  casos_cancelados: number;
  sla_porcentaje: number;
  completadas: number;
}

export interface TallerRankingRow {
  id_taller: number;
  nombre: string;
  rating_promedio: number;
  completadas: number;
  tasa_aceptacion: number;
  score: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private base = '/admin';

  constructor(private httpService: HttpService) {}

  // Talleres

  obtenerTalleres(filtros?: {
    activo?: boolean;
    verificado?: boolean;
    buscar?: string;
  }): Observable<TallerAdmin[]> {
    const params = new URLSearchParams();
    if (filtros?.activo !== undefined) params.append('activo', String(filtros.activo));
    if (filtros?.verificado !== undefined) params.append('verificado', String(filtros.verificado));
    if (filtros?.buscar) params.append('buscar', filtros.buscar);

    const qs = params.toString();
    return this.httpService.get<TallerAdmin[]>(`${this.base}/talleres${qs ? '?' + qs : ''}`);
  }

  crearTaller(datos: TallerAdminCreate): Observable<TallerCreado> {
    return this.httpService.post<TallerCreado>(`${this.base}/talleres`, datos);
  }

  obtenerTallerDetalle(id: number): Observable<TallerAdminStats> {
    return this.httpService.get<TallerAdminStats>(`${this.base}/talleres/${id}`);
  }

  toggleVerificarTaller(id: number): Observable<TallerAdmin> {
    return this.httpService.patch<TallerAdmin>(`${this.base}/talleres/${id}/verificar`, {});
  }

  eliminarTaller(id: number): Observable<{ mensaje: string }> {
    return this.httpService.delete<{ mensaje: string }>(`${this.base}/talleres/${id}`);
  }

  // Categorías

  obtenerCategorias(): Observable<CategoriaAdmin[]> {
    return this.httpService.get<CategoriaAdmin[]>(`${this.base}/categorias`);
  }

  crearCategoria(datos: { nombre: string; descripcion?: string }): Observable<CategoriaAdmin> {
    return this.httpService.post<CategoriaAdmin>(`${this.base}/categorias`, datos);
  }

  // Ganancias

  /** Ganancias de la plataforma agrupadas por mes. */
  obtenerGananciasMensual(anio?: number): Observable<GananciaMensualRow[]> {
    const qs = anio ? `?año=${anio}` : '';
    return this.httpService
      .get<GananciaMensualResponse>(`${this.base}/ganancias/mensual${qs}`)
      .pipe(map(r => r.filas));
  }

  /** Comisión por taller con rating. */
  obtenerGananciaPorTaller(filtros?: { anio?: number; mes?: number }): Observable<GananciaTallerRow[]> {
    const params = new URLSearchParams();
    if (filtros?.anio) params.append('año', String(filtros.anio));
    if (filtros?.mes) params.append('mes', String(filtros.mes));

    const qs = params.toString();
    return this.httpService
      .get<GananciaPorTallerResponse>(`${this.base}/ganancias/por-taller${qs ? '?' + qs : ''}`)
      .pipe(map(r => r.filas));
  }

  // Configuracion global

  /** Configuracion global de la plataforma (comision). */
  getConfiguracion(): Observable<ConfiguracionGlobal> {
    return this.httpService.get<ConfiguracionGlobal>(`${this.base}/configuracion`);
  }

  /** Actualiza la configuracion global de la plataforma (comision). */
  actualizarConfiguracion(body: Partial<ConfiguracionGlobal>): Observable<ConfiguracionGlobal> {
    return this.httpService.patch<ConfiguracionGlobal>(`${this.base}/configuracion`, body);
  }

  // KPIs (super-admin)

  private kpiParams(desde: string, hasta: string, extra?: Record<string, string | number | null | undefined>): string {
    const p = new URLSearchParams();
    if (desde) p.append('desde', desde);
    if (hasta) p.append('hasta', hasta);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v !== null && v !== undefined && v !== '') p.append(k, String(v));
      }
    }
    const qs = p.toString();
    return qs ? `?${qs}` : '';
  }

  /** KPIs consolidados (todos los talleres) o de un taller/tenant especifico. */
  getKpisResumen(desde: string, hasta: string, idTenant?: number | null, slaMin: number = 60): Observable<KpiResumenAdmin> {
    const qs = this.kpiParams(desde, hasta, { id_tenant: idTenant, sla_minutos: slaMin });
    return this.httpService.get<KpiResumenAdmin>(`${this.base}/kpis/resumen${qs}`);
  }

  /** KPIs comparativos por cada taller. */
  getKpisPorTaller(desde: string, hasta: string, slaMin: number = 60): Observable<TallerKpiRow[]> {
    const qs = this.kpiParams(desde, hasta, { sla_minutos: slaMin });
    return this.httpService.get<TallerKpiRow[]>(`${this.base}/kpis/por-taller${qs}`);
  }

  /** Ranking de talleres mas eficientes. */
  getRankingTalleres(desde: string, hasta: string, limite: number = 10): Observable<TallerRankingRow[]> {
    const qs = this.kpiParams(desde, hasta, { limite });
    return this.httpService.get<TallerRankingRow[]>(`${this.base}/kpis/ranking-talleres${qs}`);
  }
}
