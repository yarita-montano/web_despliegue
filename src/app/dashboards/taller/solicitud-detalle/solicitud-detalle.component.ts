import { Component, OnInit, OnDestroy, AfterViewInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AsignacionesService } from '../../../shared/services/asignaciones.service';
import { TallerService, Tecnico } from '../../../shared/services/taller.service';
import { AsignacionTaller, EstadoNombre, AceptarAsignacionBody } from '../../../shared/models/asignacion.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-solicitud-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './solicitud-detalle.component.html',
  styleUrl: './solicitud-detalle.component.scss'
})
export class SolicitudDetalleComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  asignacion = signal<AsignacionTaller | null>(null);
  cargando = signal(false);
  procesando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  mostrarModalAceptar = signal(false);
  mostrarModalRechazar = signal(false);
  mostrarMapa = signal(false);

  tecnicos = signal<Tecnico[]>([]);
  cargandoTecnicos = signal(false);

  map: L.Map | null = null;

  formAceptar: FormGroup;
  formRechazar: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private asignacionesService: AsignacionesService,
    private tallerService: TallerService,
    private fb: FormBuilder
  ) {
    this.formAceptar = this.fb.group({
      id_usuario: [null, [Validators.required]],
      eta_minutos: [20, [Validators.required, Validators.min(1), Validators.max(600)]],
      nota: ['']
    });
    this.formRechazar = this.fb.group({
      motivo: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    console.log('[SolicitudDetalle] ngOnInit →', { id });
    if (id) {
      this.cargarAsignacion(id);
    } else {
      console.warn('[SolicitudDetalle] ngOnInit: id inválido en la ruta');
    }
  }

  ngAfterViewInit(): void {
    // El mapa se inicializa cuando el usuario lo pide con mostrarMapa()
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
  }

  cargarAsignacion(id: number): void {
    console.log('[SolicitudDetalle] cargarAsignacion →', { id });
    this.cargando.set(true);
    this.error.set(null);

    this.asignacionesService.obtener(id).subscribe({
      next: (data) => {
        console.log('[SolicitudDetalle] cargarAsignacion ← OK', { estado: data.estado.nombre });
        this.asignacion.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] cargarAsignacion ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al cargar la asignación');
        this.cargando.set(false);
      }
    });
  }

  abrirModalAceptar(): void {
    this.error.set(null);
    this.mostrarModalAceptar.set(true);
    this.cargarTecnicos();
  }

  cargarTecnicos(): void {
    console.log('[SolicitudDetalle] cargarTecnicos →');
    this.cargandoTecnicos.set(true);
    this.tallerService.obtenerTecnicos().subscribe({
      next: (data) => {
        const disponibles = data.filter(t => t.disponible && t.activo);
        console.log('[SolicitudDetalle] cargarTecnicos ← OK', {
          total: data.length,
          disponibles: disponibles.length
        });
        this.tecnicos.set(disponibles);
        this.cargandoTecnicos.set(false);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] cargarTecnicos ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al cargar técnicos');
        this.cargandoTecnicos.set(false);
      }
    });
  }

  abrirModalRechazar(): void {
    this.error.set(null);
    this.mostrarModalRechazar.set(true);
  }

  cerrarModales(): void {
    this.mostrarModalAceptar.set(false);
    this.mostrarModalRechazar.set(false);
  }

  confirmarAceptar(): void {
    if (this.formAceptar.invalid) {
      console.warn('[SolicitudDetalle] confirmarAceptar: formulario inválido', this.formAceptar.value);
      return;
    }
    const asig = this.asignacion();
    if (!asig) {
      console.warn('[SolicitudDetalle] confirmarAceptar: sin asignación cargada');
      return;
    }

    this.procesando.set(true);
    const valores = this.formAceptar.value;
    const body: AceptarAsignacionBody = {
      id_usuario: Number(valores.id_usuario),
      eta_minutos: valores.eta_minutos
    };
    if (valores.nota && valores.nota.trim()) {
      body.nota = valores.nota.trim();
    }

    console.log('[SolicitudDetalle] confirmarAceptar →', { id: asig.id_asignacion, body });

    this.asignacionesService.aceptar(asig.id_asignacion, body).subscribe({
      next: (data) => {
        console.log('[SolicitudDetalle] confirmarAceptar ← OK', { estado: data.estado.nombre });
        this.asignacion.set(data);
        this.exito.set('✅ Solicitud aceptada correctamente');
        this.procesando.set(false);
        this.cerrarModales();
        setTimeout(() => this.exito.set(null), 3000);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] confirmarAceptar ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al aceptar la solicitud');
        this.procesando.set(false);
      }
    });
  }

  confirmarRechazar(): void {
    if (this.formRechazar.invalid) {
      console.warn('[SolicitudDetalle] confirmarRechazar: formulario inválido', this.formRechazar.value);
      return;
    }
    const asig = this.asignacion();
    if (!asig) {
      console.warn('[SolicitudDetalle] confirmarRechazar: sin asignación cargada');
      return;
    }

    this.procesando.set(true);
    const motivo = this.formRechazar.value.motivo.trim();

    console.log('[SolicitudDetalle] confirmarRechazar →', { id: asig.id_asignacion, motivo });

    this.asignacionesService.rechazar(asig.id_asignacion, { motivo }).subscribe({
      next: (data) => {
        console.log('[SolicitudDetalle] confirmarRechazar ← OK', { estado: data.estado.nombre });
        this.asignacion.set(data);
        this.exito.set('❌ Solicitud rechazada');
        this.procesando.set(false);
        this.cerrarModales();
        setTimeout(() => this.exito.set(null), 3000);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] confirmarRechazar ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al rechazar la solicitud');
        this.procesando.set(false);
      }
    });
  }

  abrirGoogleMaps(): void {
    const asig = this.asignacion();
    if (!asig) return;
    const { latitud, longitud } = asig.incidente;
    window.open(`https://www.google.com/maps?q=${latitud},${longitud}`, '_blank');
  }

  toggleMapa(): void {
    this.mostrarMapa.set(!this.mostrarMapa());
    if (this.mostrarMapa() && !this.map) {
      // Cargar técnicos si aún no están cargados (para mostrar ubicación del técnico asignado)
      if (this.tecnicos().length === 0) {
        this.cargarTecnicos();
      }
      setTimeout(() => this.inicializarMapa(), 100);
    }
  }

  inicializarMapa(): void {
    if (this.map || !this.mapContainer?.nativeElement) return;
    
    const asig = this.asignacion();
    if (!asig) return;

    const clienteLat = asig.incidente.latitud;
    const clienteLng = asig.incidente.longitud;
    const container = this.mapContainer.nativeElement;

    // Crear el mapa (centrado en el cliente)
    this.map = L.map(container).setView([clienteLat, clienteLng], 15);

    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 1
    }).addTo(this.map);

    // ============ MARCADOR 1: CLIENTE (Ubicación del incidente) ============
    const iconCliente = L.icon({
      iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    L.marker([clienteLat, clienteLng], {
      icon: iconCliente,
      title: `Cliente: ${asig.incidente.usuario.nombre}`
    })
      .addTo(this.map)
      .bindPopup(`
        <div class="map-popup">
          <strong style="color: red;">📍 CLIENTE</strong><br/>
          <strong>${asig.incidente.usuario.nombre}</strong><br/>
          ${clienteLat.toFixed(4)}, ${clienteLng.toFixed(4)}<br/>
          <small>Ubicación del incidente</small>
        </div>
      `);

    // ============ MARCADOR 2: TÉCNICO (Ubicación actual, si está asignado) ============
    if (asig.id_usuario) {
      // TODO: Obtener ubicación del técnico del backend
      // Por ahora, intentamos obtener datos del técnico asignado
      const tecnicoAsignado = this.tecnicos().find(t => t.id_usuario === asig.id_usuario);
      
      if (tecnicoAsignado && tecnicoAsignado.latitud != null && tecnicoAsignado.longitud != null) {
        const tecnicoLat = tecnicoAsignado.latitud;
        const tecnicoLng = tecnicoAsignado.longitud;

        const iconTecnico = L.icon({
          iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange"><path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        L.marker([tecnicoLat, tecnicoLng], {
          icon: iconTecnico,
          title: `Técnico: ${tecnicoAsignado.nombre}`
        })
          .addTo(this.map)
          .bindPopup(`
            <div class="map-popup">
              <strong style="color: orange;">🔧 TÉCNICO</strong><br/>
              <strong>${tecnicoAsignado.nombre}</strong><br/>
              ${tecnicoLat.toFixed(4)}, ${tecnicoLng.toFixed(4)}<br/>
              <small>Ubicación actual</small>
            </div>
          `);

        // Ajustar zoom para que se vean ambos marcadores
        const group = new L.FeatureGroup([
          L.marker([clienteLat, clienteLng]),
          L.marker([tecnicoLat, tecnicoLng])
        ]);
        this.map.fitBounds(group.getBounds().pad(0.1), { padding: [50, 50] });
      } else {
        // Solo mapa del cliente si el técnico no tiene ubicación
        console.log('[SolicitudDetalle] Técnico asignado sin ubicación disponible');
      }
    }

    // Invalidar el tamaño del mapa (necesario después de mostrar)
    this.map.invalidateSize();
  }

  llamarCliente(): void {
    const tel = this.asignacion()?.incidente.usuario.telefono;
    if (tel) {
      window.location.href = `tel:${tel}`;
    }
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller/solicitudes']);
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
