import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpService } from './http.service';
import { EvaluacionResponse } from '../models/evaluacion.model';

export interface Taller {
  id_taller: number;
  id_gerente: number;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  email: string;
  descripcion?: string | null;
  verificado: boolean;
  activo: boolean;
  disponible: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface Tecnico {
  id_usuario_taller: number;
  id_usuario: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  disponible: boolean;
  activo: boolean;
  latitud?: number | null;
  longitud?: number | null;
  created_at: string;
}

export interface TecnicoCreate {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface TecnicoUpdate {
  nombre?: string;
  email?: string;
  password?: string;
  telefono?: string;
  disponible?: boolean;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TallerService {

  constructor(private http: HttpService) {}

  /**
   * Obtiene información del taller del gerente autenticado
   */
  obtenerMiTaller(): Observable<Taller> {
    return this.http.get<Taller>('/talleres/mi-taller');
  }

  /**
   * Actualiza información del taller
   */
  actualizarMiTaller(datos: Partial<Taller>): Observable<Taller> {
    return this.http.put<Taller>('/talleres/mi-taller', datos);
  }

  /**
   * Obtiene lista de técnicos del taller
   */
  obtenerTecnicos(): Observable<Tecnico[]> {
    console.log('[TallerService] obtenerTecnicos →');
    return this.http.get<Tecnico[]>('/talleres/mi-taller/tecnicos').pipe(
      tap(data => console.log('[TallerService] obtenerTecnicos ← OK', {
        count: data?.length ?? 0,
        tecnicos: data?.map(t => ({
          id: t.id_usuario_taller,
          nombre: t.nombre,
          disponible: t.disponible,
          lat: t.latitud,
          lng: t.longitud
        }))
      })),
      catchError(err => {
        console.error('[TallerService] obtenerTecnicos ← ERROR', {
          status: err?.status,
          detail: err?.error?.detail
        });
        return throwError(() => err);
      })
    );
  }

  /**
   * Obtiene detalles de un técnico específico
   */
  obtenerTecnico(tecnicoId: number): Observable<Tecnico> {
    return this.http.get<Tecnico>(`/talleres/mi-taller/tecnicos/${tecnicoId}`);
  }

  /**
   * Actualiza información de un técnico
   */
  actualizarTecnico(tecnicoId: number, datos: Partial<TecnicoUpdate>): Observable<Tecnico> {
    return this.http.put<Tecnico>(`/talleres/mi-taller/tecnicos/${tecnicoId}`, datos);
  }

  /**
   * Agrega un nuevo técnico al taller
   */
  agregarTecnico(datos: TecnicoCreate): Observable<Tecnico> {
    return this.http.post<Tecnico>('/talleres/mi-taller/tecnicos', datos);
  }

  /**
   * Desactiva un técnico del taller
   */
  removerTecnico(tecnicoId: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`/talleres/mi-taller/tecnicos/${tecnicoId}`);
  }

  /**
   * NUEVO — B.3: Toggle disponibilidad del taller
   */
  toggleDisponibilidad(disponible: boolean): Observable<Taller> {
    console.log('[TallerService] toggleDisponibilidad →', { disponible });
    return this.http.put<Taller>('/talleres/mi-taller/disponibilidad', { disponible }).pipe(
      tap(data => console.log('[TallerService] toggleDisponibilidad ← OK', {
        disponible: data.disponible,
        nombre: data.nombre
      })),
      catchError(err => {
        console.error('[TallerService] toggleDisponibilidad ← ERROR', {
          status: err?.status,
          detail: err?.error?.detail
        });
        return throwError(() => err);
      })
    );
  }

  /**
   * NUEVO — A.3: Obtiene evaluaciones/reseñas del taller
   */
  obtenerEvaluaciones(): Observable<EvaluacionResponse[]> {
    console.log('[TallerService] obtenerEvaluaciones →');
    return this.http.get<EvaluacionResponse[]>('/talleres/mi-taller/evaluaciones').pipe(
      tap(data => console.log('[TallerService] obtenerEvaluaciones ← OK', {
        count: data?.length ?? 0,
        promedioEstrellas: data?.length ? (data.reduce((sum, e) => sum + e.estrellas, 0) / data.length).toFixed(1) : 0
      })),
      catchError(err => {
        console.error('[TallerService] obtenerEvaluaciones ← ERROR', {
          status: err?.status,
          detail: err?.error?.detail
        });
        return throwError(() => err);
      })
    );
  }
}
