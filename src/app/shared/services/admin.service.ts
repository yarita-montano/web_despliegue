import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpService } from './http.service';

// ── Interfaces que coinciden con los schemas del backend ────────────────────

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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private base = '/admin';

  constructor(private httpService: HttpService) {}

  // ── TALLERES ────────────────────────────────────────────────────────────────

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

  crearTaller(datos: TallerAdminCreate): Observable<TallerAdmin> {
    return this.httpService.post<TallerAdmin>(`${this.base}/talleres`, datos);
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

  // ── CATEGORÍAS ─────────────────────────────────────────────────────────────

  obtenerCategorias(): Observable<CategoriaAdmin[]> {
    return this.httpService.get<CategoriaAdmin[]>(`${this.base}/categorias`);
  }

  crearCategoria(datos: { nombre: string; descripcion?: string }): Observable<CategoriaAdmin> {
    return this.httpService.post<CategoriaAdmin>(`${this.base}/categorias`, datos);
  }

  // ── GANANCIAS ───────────────────────────────────────────────────────────────

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
}
