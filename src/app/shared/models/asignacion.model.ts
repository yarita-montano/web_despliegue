export type EstadoNombre = 'pendiente' | 'aceptada' | 'en_camino' | 'completada' | 'rechazada';

export interface EstadoAsignacion {
  id_estado_asignacion: number;
  nombre: EstadoNombre;
}

export interface UsuarioCliente {
  id_usuario: number;
  nombre: string;
  telefono?: string;
}

export interface VehiculoAsignacion {
  id_vehiculo: number;
  placa: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string;
}

export interface CategoriaIncidente {
  id_categoria: number;
  nombre: string;
}

export interface PrioridadIncidente {
  id_prioridad: number;
  nivel: string;
  orden: number;
}

export interface IncidenteAsignacion {
  id_incidente: number;
  descripcion_usuario?: string;
  resumen_ia?: string;
  latitud: number;
  longitud: number;
  created_at: string;
  usuario: UsuarioCliente;
  vehiculo: VehiculoAsignacion;
  categoria?: CategoriaIncidente;
  prioridad?: PrioridadIncidente;
}

export interface AsignacionTaller {
  id_asignacion: number;
  id_incidente: number;
  id_taller: number;
  id_usuario: number | null;
  id_estado_asignacion: number;
  eta_minutos: number | null;
  nota_taller: string | null;
  created_at: string;
  updated_at: string;
  estado: EstadoAsignacion;
  incidente: IncidenteAsignacion;
}

export interface AceptarAsignacionBody {
  id_usuario?: number;
  eta_minutos?: number;
  nota?: string;
}

export interface RechazarAsignacionBody {
  motivo: string;
}

export interface IniciarViajeRequest {
  latitud_tecnico?: number;
  longitud_tecnico?: number;
}

export interface CompletarAsignacionRequest {
  costo_estimado?: number;
  resumen_trabajo?: string;
}

