import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AsignacionesService } from '../../../shared/services/asignaciones.service';
import { AsignacionTaller, EstadoNombre } from '../../../shared/models/asignacion.model';
import { RealtimeService, WSEvent } from '../../../shared/services/realtime.service';

type FiltroSolicitudes = 'en_vivo' | EstadoNombre;

interface IncidenteLive {
  id_incidente: number;
  latitud: number;
  longitud: number;
  descripcion_usuario?: string;
  resumen_ia?: string;
  created_at: string;
  tomado?: boolean;
  aceptando?: boolean;
  mio?: boolean;
  error?: string;
}

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.scss'
})
export class SolicitudesComponent implements OnInit, OnDestroy {
  solicitudes = signal<AsignacionTaller[]>([]);
  enVivo = signal<IncidenteLive[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  filtroEstado = signal<FiltroSolicitudes>('en_vivo');

  filtrosDisponibles: FiltroSolicitudes[] = [
    'en_vivo',
    'pendiente',
    'aceptada',
    'en_camino',
    'completada',
    'rechazada'
  ];

  private wsSub?: Subscription;

  constructor(
    private asignacionesService: AsignacionesService,
    private rt: RealtimeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.wsSub = this.rt.events$.subscribe(evt => this.handleWsEvent(evt));
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  private handleWsEvent(evt: WSEvent): void {
    if (evt.event === 'incidente.nuevo') {
      const data = evt.data as IncidenteLive;
      this.enVivo.update(arr => {
        if (arr.some(x => x.id_incidente === data.id_incidente)) return arr;
        return [{ ...data }, ...arr];
      });
      return;
    }

    if (evt.event === 'incidente.tomado') {
      const id = (evt.data as { id_incidente: number }).id_incidente;
      this.enVivo.update(arr =>
        arr.map(e => (e.id_incidente === id ? { ...e, tomado: true } : e))
      );
      return;
    }

    if (evt.event === 'incidente.asignado') {
      const id = (evt.data as { id_incidente: number }).id_incidente;
      this.enVivo.update(arr =>
        arr.map(e => (e.id_incidente === id ? { ...e, mio: true, aceptando: false } : e))
      );
      return;
    }

    if (evt.event === 'asignacion.estado.cambio' && this.filtroEstado() !== 'en_vivo') {
      this.cargarSolicitudes();
    }
  }

  cargarSolicitudes(): void {
    const filtro = this.filtroEstado();
    if (filtro === 'en_vivo') return;

    this.cargando.set(true);
    this.error.set(null);

    this.asignacionesService.listar({ estado: filtro }).subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Error al cargar solicitudes');
        this.cargando.set(false);
      }
    });
  }

  cambiarFiltro(filtro: FiltroSolicitudes): void {
    this.filtroEstado.set(filtro);
    if (filtro !== 'en_vivo') {
      this.cargarSolicitudes();
    }
  }

  /**
   * Con el nuevo flujo, cuando el cliente confirma este taller ya existe
   * una asignación en pendiente. Buscamos esa asignacion y redirigimos al
   * detalle (donde se asigna técnico, se acepta formalmente, etc.).
   */
  aceptarIncidente(e: IncidenteLive): void {
    e.aceptando = true;
    e.error = undefined;
    this.asignacionesService.listar({}).subscribe({
      next: (asignaciones) => {
        const mia = asignaciones.find(
          (a) => a.incidente?.id_incidente === e.id_incidente,
        );
        e.aceptando = false;
        if (mia) {
          this.router.navigate(['/dashboard/taller/solicitudes', mia.id_asignacion]);
        } else {
          e.tomado = true;
          e.error = 'No tienes una asignación para este incidente.';
        }
      },
      error: (err) => {
        e.aceptando = false;
        e.error = err?.error?.detail ?? 'Error consultando asignación';
      },
    });
  }

  abrirEnMaps(e: IncidenteLive): void {
    window.open(`https://www.google.com/maps?q=${e.latitud},${e.longitud}`, '_blank');
  }

  verDetalle(asignacion: AsignacionTaller): void {
    this.router.navigate(['/dashboard/taller/solicitudes', asignacion.id_asignacion]);
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller']);
  }

  etiquetaFiltro(filtro: FiltroSolicitudes): string {
    const map: Record<FiltroSolicitudes, string> = {
      en_vivo: '🔴 En vivo',
      pendiente: '⏳ Pendiente',
      aceptada: '✅ Aceptada',
      en_camino: '🚚 En camino',
      completada: '🏁 Completada',
      rechazada: '❌ Rechazada'
    };
    return map[filtro] ?? filtro;
  }

  etiquetaEstado(estado: EstadoNombre): string {
    return this.etiquetaFiltro(estado as FiltroSolicitudes);
  }
}
