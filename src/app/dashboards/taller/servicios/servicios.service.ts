import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../shared/services/http.service';

export interface Categoria {
  id_categoria: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  requiere_cotizacion: boolean;
  icono_url?: string;
}

export interface TallerServicio {
  id_taller_servicio?: number;
  id_taller?: number;
  id_categoria: number;
  tarifa_base?: number;
  tiempo_estimado_min?: number;
}

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private http = inject(HttpService);

  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>('/categorias');
  }

  listarMisServicios(): Observable<TallerServicio[]> {
    return this.http.get<TallerServicio[]>('/talleres/mi-taller/servicios');
  }

  guardarServicios(servicios: TallerServicio[]): Observable<TallerServicio[]> {
    return this.http.put<TallerServicio[]>('/talleres/mi-taller/servicios', { servicios });
  }

  obtenerMiTaller(): Observable<{ tarifa_traslado?: number }> {
    return this.http.get<{ tarifa_traslado?: number }>('/talleres/mi-taller');
  }

  actualizarTarifaKm(tarifa: number): Observable<{ tarifa_traslado: number }> {
    return this.http.patch<{ tarifa_traslado: number }>(
      '/talleres/mi-taller/tarifa-traslado',
      { tarifa_traslado: tarifa },
    );
  }
}
