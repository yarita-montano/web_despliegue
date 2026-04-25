import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AsignacionesService } from '../../../shared/services/asignaciones.service';
import { AsignacionTaller, EstadoNombre } from '../../../shared/models/asignacion.model';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.scss'
})
export class SolicitudesComponent implements OnInit {
  solicitudes = signal<AsignacionTaller[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  filtroEstado = signal<EstadoNombre>('pendiente');

  estadosDisponibles: EstadoNombre[] = [
    'pendiente',
    'aceptada',
    'en_camino',
    'completada',
    'rechazada'
  ];

  constructor(
    private asignacionesService: AsignacionesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[SolicitudesComponent] ngOnInit');
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    const estado = this.filtroEstado();
    console.log('[SolicitudesComponent] cargarSolicitudes →', { estado });
    this.cargando.set(true);
    this.error.set(null);

    this.asignacionesService.listar({ estado }).subscribe({
      next: (data) => {
        console.log('[SolicitudesComponent] cargarSolicitudes ← OK', { count: data.length });
        this.solicitudes.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('[SolicitudesComponent] cargarSolicitudes ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al cargar solicitudes');
        this.cargando.set(false);
      }
    });
  }

  cambiarFiltro(estado: EstadoNombre): void {
    console.log('[SolicitudesComponent] cambiarFiltro →', { estado });
    this.filtroEstado.set(estado);
    this.cargarSolicitudes();
  }

  verDetalle(asignacion: AsignacionTaller): void {
    this.router.navigate(['/dashboard/taller/solicitudes', asignacion.id_asignacion]);
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller']);
  }

  etiquetaEstado(estado: EstadoNombre): string {
    const map: Record<EstadoNombre, string> = {
      pendiente: '⏳ Pendiente',
      aceptada: '✅ Aceptada',
      en_camino: '🚚 En camino',
      completada: '🏁 Completada',
      rechazada: '❌ Rechazada'
    };
    return map[estado] ?? estado;
  }
}
