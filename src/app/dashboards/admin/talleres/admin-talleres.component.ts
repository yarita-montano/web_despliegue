import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService, TallerAdmin, TallerAdminCreate, TallerCreado, CategoriaAdmin, ConfiguracionGlobal } from '../../../shared/services/admin.service';
import { notificacion } from '../../../shared/utils/notificacion.util';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import * as L from 'leaflet';

@Component({
  selector: 'app-admin-talleres',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-talleres.component.html',
  styleUrl: './admin-talleres.component.scss'
})
export class AdminTalleresComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  talleres: TallerAdmin[] = [];
  categorias: CategoriaAdmin[] = [];
  categoriasSeleccionadas = new Set<number>();

  formTaller!: FormGroup;
  formCategoria!: FormGroup;

  filtroActivo: string = '';
  filtroVerificado: string = '';
  buscar: string = '';

  mostrarFormulario = false;
  mostrarFormCategoria = false;
  cargando = false;
  guardandoCategoria = false;

  // Comision global de la plataforma (valor unico aplicado a todos los talleres)
  comisionPct: number = 0;
  cargandoComision = false;
  guardandoComision = false;

  // Tras crear un taller, guardamos su subdominio para mostrarlo al admin
  tallerCreado: { nombre: string; slug: string; url: string } | null = null;

  private map?: L.Map;
  private marker?: L.Marker;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.crearFormularios();
  }

  ngOnInit(): void {
    this.cargarTalleres();
    this.cargarCategorias();
    this.cargarComision();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  crearFormularios(): void {
    this.formTaller = this.fb.group({
      nombre:        ['', [Validators.required, Validators.minLength(2)]],
      email:         ['', [Validators.required, Validators.email]],
      password:      ['', [Validators.required, Validators.minLength(8)]],
      telefono:      [''],
      direccion:     [''],
      latitud:       [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitud:      [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      capacidad_max: [5, [Validators.required, Validators.min(1), Validators.max(100)]],
      verificado:    [true],
    });

    this.formCategoria = this.fb.group({
      nombre:      ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
    });
  }

  // Carga de datos

  cargarTalleres(): void {
    this.cargando = true;
    const filtros = {
      activo:     this.filtroActivo === ''     ? undefined : this.filtroActivo === 'true',
      verificado: this.filtroVerificado === '' ? undefined : this.filtroVerificado === 'true',
      buscar:     this.buscar || undefined,
    };

    this.adminService.obtenerTalleres(filtros)
      .pipe(takeUntil(this.destroy$), finalize(() => { this.cargando = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (datos) => { this.talleres = datos; this.cdr.markForCheck(); },
        error: () => notificacion('Error al cargar talleres', 'error'),
      });
  }

  cargarCategorias(): void {
    this.adminService.obtenerCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cats) => { this.categorias = cats; this.cdr.markForCheck(); },
        error: () => notificacion('Error al cargar categorías', 'error'),
      });
  }

  // Comision global de la plataforma

  cargarComision(): void {
    this.cargandoComision = true;
    this.adminService.getConfiguracion()
      .pipe(takeUntil(this.destroy$), finalize(() => { this.cargandoComision = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (cfg) => { this.comisionPct = cfg.comision_plataforma_pct ?? 0; this.cdr.markForCheck(); },
        error: () => notificacion('Error al cargar la comisión', 'error'),
      });
  }

  guardarComision(): void {
    const comision = Number(this.comisionPct);

    if (!Number.isFinite(comision) || comision < 0 || comision > 100) {
      notificacion('La comisión debe estar entre 0 y 100', 'warning');
      return;
    }

    this.guardandoComision = true;
    this.adminService.actualizarConfiguracion({ comision_plataforma_pct: comision })
      .pipe(takeUntil(this.destroy$), finalize(() => { this.guardandoComision = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (cfg) => {
          this.comisionPct = cfg.comision_plataforma_pct ?? 0;
          notificacion('Comisión actualizada', 'success');
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err?.error?.detail ?? 'Error al guardar la comisión';
          notificacion(msg, 'error');
        },
      });
  }

  // Filtros

  aplicarFiltros(): void { this.cargarTalleres(); }

  limpiarFiltros(): void {
    this.filtroActivo = '';
    this.filtroVerificado = '';
    this.buscar = '';
    this.cargarTalleres();
  }

  // Formulario de taller

  abrirFormulario(): void {
    this.mostrarFormulario = true;
    this.mostrarFormCategoria = false;
    this.categoriasSeleccionadas.clear();
    this.formTaller.reset({ capacidad_max: 5, verificado: true, latitud: null, longitud: null });
    setTimeout(() => this.inicializarMapa(), 0);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.mostrarFormCategoria = false;
    this.formTaller.reset();
    this.formCategoria.reset();
    this.categoriasSeleccionadas.clear();
  }

  toggleCategoria(id: number): void {
    if (this.categoriasSeleccionadas.has(id)) {
      this.categoriasSeleccionadas.delete(id);
    } else {
      this.categoriasSeleccionadas.add(id);
    }
  }

  estaSeleccionada(id: number): boolean {
    return this.categoriasSeleccionadas.has(id);
  }

  seleccionarTodas(): void {
    this.categorias.forEach(c => this.categoriasSeleccionadas.add(c.id_categoria));
  }

  deseleccionarTodas(): void {
    this.categoriasSeleccionadas.clear();
  }

  guardarTaller(): void {
    if (this.formTaller.invalid) {
      this.formTaller.markAllAsTouched();
      notificacion('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    this.cargando = true;
    const datos: TallerAdminCreate = {
      ...this.formTaller.value,
      categorias: Array.from(this.categoriasSeleccionadas),
    };

    this.adminService.crearTaller(datos)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (creado: TallerCreado) => {
          notificacion('Taller registrado exitosamente', 'success');
          if (creado?.slug) {
            this.tallerCreado = {
              nombre: creado.nombre,
              slug: creado.slug,
              url: `https://${creado.slug}.${this.getBaseDomain()}`,
            };
          }
          this.cerrarFormulario();
          this.cargarTalleres();
        },
        error: (err) => {
          const msg = err?.error?.detail ?? 'Error al registrar taller';
          notificacion(msg, 'error');
          this.cargando = false;
        },
      });
  }

  /** Dominio base (registrable) del host actual: para armar la URL del subdominio del taller. */
  private getBaseDomain(): string {
    const host = window.location.hostname;
    if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
    const parts = host.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : host;
  }

  copiarUrlTaller(): void {
    if (!this.tallerCreado) return;
    navigator.clipboard?.writeText(this.tallerCreado.url);
    notificacion('URL copiada', 'success');
  }

  // Formulario de nueva categoría

  abrirFormCategoria(): void {
    this.mostrarFormCategoria = true;
    this.formCategoria.reset();
  }

  cancelarFormCategoria(): void {
    this.mostrarFormCategoria = false;
    this.formCategoria.reset();
  }

  guardarNuevaCategoria(): void {
    if (this.formCategoria.invalid) {
      this.formCategoria.markAllAsTouched();
      return;
    }

    this.guardandoCategoria = true;
    const datos = this.formCategoria.value;

    this.adminService.crearCategoria(datos)
      .pipe(takeUntil(this.destroy$), finalize(() => { this.guardandoCategoria = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (nueva) => {
          this.categorias = [...this.categorias, nueva];
          this.categoriasSeleccionadas.add(nueva.id_categoria);
          this.mostrarFormCategoria = false;
          this.formCategoria.reset();
          notificacion(`Servicio "${nueva.nombre}" creado`, 'success');
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err?.error?.detail ?? 'Error al crear categoría';
          notificacion(msg, 'error');
        },
      });
  }

  // Acciones sobre talleres

  verificarTaller(taller: TallerAdmin): void {
    const accion = taller.verificado ? 'desverificar' : 'verificar';
    if (!confirm(`¿Deseas ${accion} el taller "${taller.nombre}"?`)) return;

    this.adminService.toggleVerificarTaller(taller.id_taller)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { notificacion(`Taller ${accion}do correctamente`, 'success'); this.cargarTalleres(); },
        error: () => notificacion('Error al actualizar verificación', 'error'),
      });
  }

  eliminarTaller(taller: TallerAdmin): void {
    if (!confirm(`¿Dar de baja el taller "${taller.nombre}"? Esta acción es reversible por el admin.`)) return;

    this.adminService.eliminarTaller(taller.id_taller)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { notificacion('Taller dado de baja correctamente', 'success'); this.cargarTalleres(); },
        error: () => notificacion('Error al dar de baja el taller', 'error'),
      });
  }

  // Mapa

  actualizarMarcadorDesdeInputs(): void {
    const lat = Number(this.formTaller.get('latitud')?.value);
    const lng = Number(this.formTaller.get('longitud')?.value);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      this.colocarMarcador(lat, lng);
      this.map?.panTo([lat, lng]);
    }
  }

  private inicializarMapa(): void {
    if (!this.mapContainer?.nativeElement) return;

    const defaultLat = -17.8;
    const defaultLng = -63.18;
    const lat = Number(this.formTaller.get('latitud')?.value) || defaultLat;
    const lng = Number(this.formTaller.get('longitud')?.value) || defaultLng;

    if (this.map) {
      this.map.invalidateSize();
      this.map.setView([lat, lng], 13);
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: true }).setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.colocarMarcador(lat, lng);
      this.formTaller.patchValue({ latitud: Number(lat.toFixed(6)), longitud: Number(lng.toFixed(6)) });
      this.cdr.markForCheck();
    });

    if (this.formTaller.get('latitud')?.value != null) {
      this.colocarMarcador(lat, lng);
    }
  }

  private colocarMarcador(lat: number, lng: number): void {
    if (!this.map) return;
    const punto: L.LatLngExpression = [lat, lng];
    const icono = L.divIcon({
      className: 'pin-taller-marker',
      html: `<div class="pin-wrap"><div class="pin-drop"></div><div class="pin-circle"></div></div>`,
      iconSize: [36, 52],
      iconAnchor: [18, 50],
      popupAnchor: [0, -44],
    });

    if (!this.marker) {
      this.marker = L.marker(punto, { icon: icono }).addTo(this.map);
    } else {
      this.marker.setLatLng(punto);
    }
  }
}
