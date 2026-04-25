import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpService } from './http.service';
import {
  AsignacionTaller,
  EstadoNombre,
  AceptarAsignacionBody,
  RechazarAsignacionBody
} from '../models/asignacion.model';

@Injectable({
  providedIn: 'root'
})
export class AsignacionesService {

  constructor(private http: HttpService) {}

  listar(filtros?: { estado?: EstadoNombre; desde?: string; hasta?: string }): Observable<AsignacionTaller[]> {
    let query = '';
    const params: string[] = [];
    
    if (filtros?.estado) params.push(`estado=${filtros.estado}`);
    if (filtros?.desde) params.push(`desde=${filtros.desde}`);
    if (filtros?.hasta) params.push(`hasta=${filtros.hasta}`);
    
    if (params.length > 0) query = '?' + params.join('&');
    
    const url = `/talleres/mi-taller/asignaciones${query}`;
    console.log('[AsignacionesService] listar →', { filtros, url });

    return this.http.get<AsignacionTaller[]>(url).pipe(
      tap(data => {
        console.log('[AsignacionesService] listar ← OK', { 
          count: data?.length ?? 0,
          locations: data?.map(d => ({ id: d.id_asignacion, lat: d.incidente.latitud, lng: d.incidente.longitud, cliente: d.incidente.usuario.nombre })) ?? []
        });
      }),
      catchError(err => {
        console.error('[AsignacionesService] listar ← ERROR', {
          status: err?.status,
          message: err?.message,
          detail: err?.error?.detail
        });
        return throwError(() => err);
      })
    );
  }

  obtener(idAsignacion: number): Observable<AsignacionTaller> {
    const url = `/talleres/mi-taller/asignaciones/${idAsignacion}`;
    console.log('[AsignacionesService] obtener →', { idAsignacion, url });

    return this.http.get<AsignacionTaller>(url).pipe(
      tap(data => console.log('[AsignacionesService] obtener ← OK', { 
        id: data?.id_asignacion,
        cliente: data?.incidente?.usuario?.nombre,
        lat: data?.incidente?.latitud,
        lng: data?.incidente?.longitud
      })),
      catchError(err => {
        console.error('[AsignacionesService] obtener ← ERROR', {
          status: err?.status,
          detail: err?.error?.detail
        });
        return throwError(() => err);
      })
    );
  }

  aceptar(idAsignacion: number, body: AceptarAsignacionBody): Observable<AsignacionTaller> {
    const url = `/talleres/mi-taller/asignaciones/${idAsignacion}/aceptar`;
    console.log('[AsignacionesService] aceptar →', { idAsignacion, body, url });

    return this.http.put<AsignacionTaller>(url, body).pipe(
      tap(data => console.log('[AsignacionesService] aceptar ← OK', { 
        id: data?.id_asignacion,
        estado: data?.estado?.nombre,
        lat: data?.incidente?.latitud,
        lng: data?.incidente?.longitud
      })),
      catchError(err => {
        console.error('[AsignacionesService] aceptar ← ERROR', {
          status: err?.status,
          detail: err?.error?.detail
        });
        return throwError(() => err);
      })
    );
  }

  rechazar(idAsignacion: number, body: RechazarAsignacionBody): Observable<AsignacionTaller> {
    const url = `/talleres/mi-taller/asignaciones/${idAsignacion}/rechazar`;
    console.log('[AsignacionesService] rechazar →', { idAsignacion, body, url });

    return this.http.put<AsignacionTaller>(url, body).pipe(
      tap(data => console.log('[AsignacionesService] rechazar ← OK', { 
        id: data?.id_asignacion,
        estado: data?.estado?.nombre,
        lat: data?.incidente?.latitud,
        lng: data?.incidente?.longitud
      })),
      catchError(err => {
        console.error('[AsignacionesService] rechazar ← ERROR', {
          status: err?.status,
          detail: err?.error?.detail
        });
        return throwError(() => err);
      })
    );
  }
}
