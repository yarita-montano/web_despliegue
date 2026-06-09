import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, exhaustMap, startWith } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

// Leaflet se carga por CDN en index.html (no por npm) para no tocar el build.
declare const L: any;

interface PuntoGeo {
  latitud: number;
  longitud: number;
}

interface Seguimiento {
  id_incidente: number;
  estado: string;
  cliente: PuntoGeo;
  tecnico: PuntoGeo | null;
  nombre_tecnico: string | null;
  taller_nombre: string | null;
  eta_min: number | null;
  distancia_km: number | null;
  actualizado: string;
}

/**
 * Pagina PUBLICA de seguimiento en vivo (opcion C).
 * Accesible sin login via /seguir/:token. Hace polling cada 5s al endpoint
 * publico del backend y pinta en un mapa Leaflet la posicion del cliente y la
 * del tecnico, con la ruta entre ambos.
 */
@Component({
  selector: 'app-seguir',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seguir.component.html',
  styleUrl: './seguir.component.scss',
})
export class SeguirComponent implements OnInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  data: Seguimiento | null = null;
  error: string | null = null;
  cargando = true;
  online = true;

  private token = '';
  private sub?: Subscription;
  private terminal = false;

  private map: any;
  private markerCliente: any;
  private markerTecnico: any;
  private linea: any;
  private centrado = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.error = 'Enlace inválido.';
      this.cargando = false;
      return;
    }

    this.initMapa();

    const url = `${environment.apiUrl}/public/seguimiento/${encodeURIComponent(
      this.token,
    )}`;

    // HttpClient crudo (no HttpService): no añade Authorization ni dispara el
    // logout-on-401, así la página pública nunca depende de una sesión.
    this.sub = interval(5000)
      .pipe(
        startWith(0),
        exhaustMap(() =>
          this.http.get<Seguimiento>(url).pipe(
            catchError((err) => {
              this.online = navigator.onLine;
              if (err?.status === 401) {
                this.error = 'El enlace expiró o no es válido.';
                this.terminal = true;
              } else if (err?.status === 404) {
                this.error = 'No se encontró el seguimiento.';
                this.terminal = true;
              } else if (this.online) {
                this.error = 'No se pudo cargar el seguimiento.';
              }
              return of(null);
            }),
          ),
        ),
      )
      .subscribe((d) => {
        this.cargando = false;
        if (d) {
          this.error = null;
          this.online = true;
          this.data = d;
          this.pintar(d);
        }
        // Esta app necesita CD manual en componentes con polling (mismo patron
        // que mensajes.component): sin esto, cargando/data cambian en memoria
        // pero la vista (*ngIf) no se actualiza y queda en "Cargando".
        this.cdr.detectChanges();
        if (this.terminal) {
          this.sub?.unsubscribe();
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.map) {
      try {
        this.map.remove();
      } catch {
        /* noop */
      }
    }
  }

  private initMapa(): void {
    this.map = L.map(this.mapEl.nativeElement).setView([-17.78, -63.18], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
    // El contenedor puede no tener tamaño final al crear el mapa.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private pintar(d: Seguimiento): void {
    const cli: [number, number] = [d.cliente.latitud, d.cliente.longitud];

    if (!this.markerCliente) {
      this.markerCliente = L.circleMarker(cli, {
        radius: 9,
        color: '#1d4ed8',
        fillColor: '#3b82f6',
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(this.map)
        .bindPopup('Cliente');
    } else {
      this.markerCliente.setLatLng(cli);
    }

    if (d.tecnico) {
      const tec: [number, number] = [d.tecnico.latitud, d.tecnico.longitud];
      if (!this.markerTecnico) {
        this.markerTecnico = L.circleMarker(tec, {
          radius: 9,
          color: '#984b30',
          fillColor: '#c26849',
          fillOpacity: 0.95,
          weight: 2,
        })
          .addTo(this.map)
          .bindPopup('Técnico');
      } else {
        this.markerTecnico.setLatLng(tec);
      }

      const pts: [number, number][] = [tec, cli];
      if (!this.linea) {
        this.linea = L.polyline(pts, {
          color: '#c26849',
          weight: 4,
          opacity: 0.7,
          dashArray: '6 8',
        }).addTo(this.map);
      } else {
        this.linea.setLatLngs(pts);
      }

      if (!this.centrado) {
        this.map.fitBounds(L.latLngBounds(pts).pad(0.35));
        this.centrado = true;
      }
    } else if (!this.centrado) {
      this.map.setView(cli, 14);
      this.centrado = true;
    }
  }

  estadoLegible(estado: string): string {
    const m: Record<string, string> = {
      pendiente: 'Buscando taller',
      en_proceso: 'En proceso',
      aceptada: 'Solicitud aceptada',
      en_camino: 'Técnico en camino',
      llegado: 'Técnico llegó',
      completada: 'Servicio completado',
      atendido: 'Atendido',
      cancelado: 'Cancelado',
    };
    return m[estado] ?? estado;
  }
}
