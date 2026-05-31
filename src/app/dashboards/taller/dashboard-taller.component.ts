import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, TallerAuth } from '../../shared/services/auth.service';
import { TallerService, Taller, Tecnico, TecnicoCreate, TecnicoUpdate, CategoriaDisponible, ServicioTaller } from '../../shared/services/taller.service';
import { AsignacionesService } from '../../shared/services/asignaciones.service';
import { AsignacionTaller } from '../../shared/models/asignacion.model';
import { EvaluacionResponse } from '../../shared/models/evaluacion.model';
import { RealtimeService, WSEvent } from '../../shared/services/realtime.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Nota: ya no usamos un tipo aparte EmergenciaLive. Tras unificar dashboard,
// la lista en vivo es directamente AsignacionTaller (las asignaciones que el
// backend ya creó al confirmar el cliente), y el WS sólo dispara refrescos
// para mantenerla actualizada en tiempo real.

interface DashboardStat {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-taller',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-taller.component.html',
  styleUrl: './dashboard-taller.component.scss'
})
export class DashboardTallerComponent implements OnInit, OnDestroy {
  currentTaller: TallerAuth | null = null;
  taller: Taller | null = null;
  tecnicos: Tecnico[] = [];
  disponible = false;
  cambiandoDisponibilidad = false;

  errorEmergencia: string | null = null;
  // Lista en vivo unificada: asignaciones en pendiente del taller, alimentada
  // por API al cargar y actualizada por WebSocket en cada evento.
  solicitudesPendientes: AsignacionTaller[] = [];
  // Estado UI por asignacion (cargando, error) para el botón "Ver información".
  uiAsig: Record<number, { cargando?: boolean; error?: string }> = {};
  private _wsSub?: Subscription;

  mostrarInfoTaller = false;
  cargandoInfoTaller = false;

  mostrarTecnicos = false;
  cargandoTecnicos = false;

  categorias: CategoriaDisponible[] = [];
  misServicios = new Set<number>();
  mostrarServicios = false;
  cargandoServicios = false;
  guardandoServicios = false;

  editForm: FormGroup;
  formTecnico: FormGroup;

  mostrarFormularioEdicion = false;
  mostrarFormularioTecnico = false;
  tecnicoEnEdicion: Tecnico | null = null;

  guardando = false;
  guardandoTecnico = false;
  error: string | null = null;
  errorTecnico: string | null = null;
  exito: string | null = null;
  exitoTecnico: string | null = null;
  cargandoResumen = false;
  gananciasMes = 0;
  ticketPromedioMes = 0;
  totalServiciosMes = 0;


  quickActions = [
    { icon: '📋', label: 'Asignaciones', action: 'assignments' },
    { icon: '📜', label: 'Historial', action: 'historial' },
  ];

  stats: DashboardStat[] = [
    { label: 'Solicitudes pendientes', value: '—', icon: '📋' },
    { label: 'Trabajos activos', value: '—', icon: '⏳' },
    { label: 'Completadas este mes', value: '—', icon: '✅' },
    { label: 'Técnicos disponibles', value: '—', icon: '👨‍🔧' },
    { label: 'Promedio reseñas', value: '—', icon: '⭐' },
  ];

  constructor(
    private authService: AuthService,
    private tallerService: TallerService,
    private asignacionesService: AsignacionesService,
    private rt: RealtimeService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.currentTaller = this.authService.getCurrentTaller();
    this.editForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', Validators.required],
      telefono: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      descripcion: ['', Validators.minLength(10)]
    });
    this.formTecnico = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    this.cargarDatosTaller();
    this.cargarResumenDashboard();
    this.cargarCategorias();
    this._wsSub = this.rt.events$.subscribe(evt => this.handleWsEvent(evt));
  }

  ngOnDestroy(): void {
    this._wsSub?.unsubscribe();
  }

  private handleWsEvent(evt: WSEvent): void {
    // Con el flujo unificado, cualquier evento que afecte una asignación se
    // traduce a un refresh de la lista en vivo (es persistente y consulta la
    // API). Mantenemos el switch para claridad y por si en el futuro queremos
    // animaciones distintas por tipo de evento.
    switch (evt.event) {
      case 'incidente.nuevo':
      case 'incidente.tomado':
      case 'incidente.asignado':
      case 'asignacion.estado.cambio':
        this.refrescarPendientes();
        break;
    }
  }

  private refrescarPendientes(): void {
    this.asignacionesService.listar({ estado: 'pendiente' })
      .pipe(catchError(() => of([] as AsignacionTaller[])))
      .subscribe(data => {
        this.solicitudesPendientes = data;
        this.cdr.markForCheck();
      });
  }

  /**
   * Click en "Ver información" en una card en vivo: navega al detalle de la
   * asignación (asignar técnico, aceptar formalmente, mensajes, etc.).
   */
  verInformacionAsignacion(s: AsignacionTaller): void {
    this.router.navigate(['/dashboard/taller/solicitudes', s.id_asignacion]);
  }

  abrirEnMapsAsignacion(s: AsignacionTaller): void {
    const lat = s.incidente?.latitud;
    const lng = s.incidente?.longitud;
    if (lat == null || lng == null) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }

  irAMensajes(idIncidente: number): void {
    this.router.navigate(['/dashboard/taller/mensajes', idIncidente]);
  }

  cargarResumenDashboard(): void {
    console.log('[DashboardTaller] cargarResumenDashboard →');
    this.cargandoResumen = true;
    this.cargandoTecnicos = true;

    const inicioMes = this.inicioDelMes();
    const hoy = this.fechaDeHoy();

    forkJoin({
      pendientes: this.asignacionesService.listar({ estado: 'pendiente' }).pipe(catchError(() => of([] as AsignacionTaller[]))),
      aceptadas: this.asignacionesService.listar({ estado: 'aceptada' }).pipe(catchError(() => of([] as AsignacionTaller[]))),
      enCamino: this.asignacionesService.listar({ estado: 'en_camino' }).pipe(catchError(() => of([] as AsignacionTaller[]))),
      historialMes: this.asignacionesService.historial({ pagina: 1, porPagina: 100, desde: inicioMes, hasta: hoy }).pipe(catchError(() => of([] as AsignacionTaller[]))),
      tecnicos: this.tallerService.obtenerTecnicos().pipe(catchError(() => of([] as Tecnico[]))),
      evaluaciones: this.tallerService.obtenerEvaluaciones().pipe(catchError(() => of([] as EvaluacionResponse[]))),
    }).subscribe({
      next: ({ pendientes, aceptadas, enCamino, historialMes, tecnicos, evaluaciones }) => {
        this.solicitudesPendientes = pendientes;
        this.tecnicos = tecnicos;
        this.totalServiciosMes = historialMes.length;

        this.gananciasMes = historialMes.reduce((acumulado, asignacion) => {
          return acumulado + this.obtenerMontoAsignacion(asignacion);
        }, 0);

        this.ticketPromedioMes = this.totalServiciosMes > 0
          ? this.gananciasMes / this.totalServiciosMes
          : 0;

        const tecnicosDisponibles = tecnicos.filter(t => t.activo && t.disponible).length;
        const promedioResenas = evaluaciones.length
          ? (evaluaciones.reduce((sum, e) => sum + e.estrellas, 0) / evaluaciones.length).toFixed(1)
          : '—';

        this.stats = [
          { label: 'Solicitudes pendientes', value: String(pendientes.length), icon: '📋' },
          { label: 'Trabajos activos', value: String(aceptadas.length + enCamino.length), icon: '⏳' },
          { label: 'Completadas este mes', value: String(historialMes.length), icon: '✅' },
          { label: 'Técnicos disponibles', value: String(tecnicosDisponibles), icon: '👨‍🔧' },
          { label: 'Promedio reseñas', value: promedioResenas === '—' ? '—' : `${promedioResenas}/5`, icon: '⭐' },
        ];

        this.cargandoResumen = false;
        this.cargandoTecnicos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[DashboardTaller] cargarResumenDashboard ← ERROR', err);
        this.error = err?.error?.detail || err?.message || 'Error al cargar métricas del dashboard';
        this.cargandoResumen = false;
        this.cargandoTecnicos = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleInfoTaller(): void {
    this.mostrarInfoTaller = !this.mostrarInfoTaller;
    this.cdr.markForCheck();
    if (this.mostrarInfoTaller && !this.taller) {
      this.cargarDatosTaller();
    }
  }

  toggleTecnicos(): void {
    console.log('[DashboardTaller] toggleTecnicos →', { mostrarTecnicos: !this.mostrarTecnicos, tecnicosCount: this.tecnicos.length });
    this.mostrarTecnicos = !this.mostrarTecnicos;
    this.cdr.markForCheck();
    if (this.mostrarTecnicos && this.tecnicos.length === 0) {
      this.cargarTecnicos();
    }
  }

  irASolicitud(asignacion: AsignacionTaller): void {
    this.router.navigate(['/dashboard/taller/solicitudes', asignacion.id_asignacion]);
  }

  irATodasSolicitudes(): void {
    this.router.navigate(['/dashboard/taller/solicitudes']);
  }

  etiquetaPrioridad(nivel?: string): string {
    return nivel || 'sin prioridad';
  }

  cargarDatosTaller(): void {
    this.cargandoInfoTaller = true;
    this.tallerService.obtenerMiTaller().subscribe({
      next: (data) => {
        this.taller = data;
        this.currentTaller = {
          ...(this.currentTaller ?? {} as TallerAuth),
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono ?? '',
          direccion: data.direccion ?? '',
        } as TallerAuth;
        this.disponible = data.disponible;
        this.editForm.patchValue({
          nombre: data.nombre,
          direccion: data.direccion,
          telefono: data.telefono,
          email: data.email,
          descripcion: data.descripcion
        });
        this.cargandoInfoTaller = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.error?.detail || err.message || 'Error al cargar datos del taller';
        this.cargandoInfoTaller = false;
        this.cdr.markForCheck();
      }
    });
  }

  cargarTecnicos(): void {
    console.log('[DashboardTaller] cargarTecnicos →');
    this.cargandoTecnicos = true;
    this.tallerService.obtenerTecnicos().subscribe({
      next: (data) => {
        console.log('[DashboardTaller] cargarTecnicos ← OK', { count: data.length, tecnicos: data });
        this.tecnicos = [...data];
        this.cargandoTecnicos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[DashboardTaller] cargarTecnicos ← ERROR', err);
        this.errorTecnico = err.error?.detail || err.message || 'Error al cargar técnicos';
        this.cargandoTecnicos = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirFormularioEdicion(): void {
    this.mostrarFormularioEdicion = true;
    this.error = null;
    this.exito = null;
  }

  cerrarFormularioEdicion(): void {
    this.mostrarFormularioEdicion = false;
    this.error = null;
    this.exito = null;
  }

  abrirFormularioTecnico(): void {
    this.aplicarValidadoresTecnicoCreacion();
    this.mostrarFormularioTecnico = true;
    this.tecnicoEnEdicion = null;
    this.formTecnico.reset();
    this.errorTecnico = null;
    this.exitoTecnico = null;
  }

  cerrarFormularioTecnico(): void {
    this.mostrarFormularioTecnico = false;
    this.tecnicoEnEdicion = null;
    this.errorTecnico = null;
    this.exitoTecnico = null;
    this.formTecnico.reset();
    this.aplicarValidadoresTecnicoCreacion();
  }

  private aplicarValidadoresTecnicoCreacion(): void {
    this.formTecnico.get('email')?.setValidators([Validators.required, Validators.email]);
    this.formTecnico.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.formTecnico.get('email')?.updateValueAndValidity({ emitEvent: false });
    this.formTecnico.get('password')?.updateValueAndValidity({ emitEvent: false });
  }

  private aplicarValidadoresTecnicoEdicion(): void {
    this.formTecnico.get('email')?.setValidators([Validators.email]);
    this.formTecnico.get('password')?.setValidators([Validators.minLength(8)]);
    this.formTecnico.get('email')?.updateValueAndValidity({ emitEvent: false });
    this.formTecnico.get('password')?.updateValueAndValidity({ emitEvent: false });
  }

  guardarCambios(): void {
    if (this.editForm.invalid) {
      this.error = 'Por favor completa todos los campos correctamente';
      return;
    }

    this.guardando = true;
    this.error = null;
    this.exito = null;

    this.tallerService.actualizarMiTaller(this.editForm.value).subscribe({
      next: (data) => {
        this.taller = data;
        this.currentTaller = {
          ...(this.currentTaller ?? {} as TallerAuth),
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono ?? '',
          direccion: data.direccion ?? '',
        } as TallerAuth;
        this.exito = '✅ Datos del taller actualizados correctamente';
        this.guardando = false;
        setTimeout(() => {
          this.cerrarFormularioEdicion();
          this.exito = null;
        }, 2000);
      },
      error: (err) => {
        this.error = err.error?.detail || 'Error al actualizar el taller';
        this.guardando = false;
      }
    });
  }

  guardarTecnico(): void {
    if (this.formTecnico.invalid) {
      this.errorTecnico = 'Por favor completa todos los campos correctamente';
      return;
    }

    this.guardandoTecnico = true;
    this.errorTecnico = null;
    this.exitoTecnico = null;

    if (this.tecnicoEnEdicion) {
      this.aplicarValidadoresTecnicoEdicion();
      const valores = this.formTecnico.value;
      const payload: TecnicoUpdate = {
        nombre: String(valores.nombre ?? '').trim(),
      };
      const email = String(valores.email ?? '').trim();
      const password = String(valores.password ?? '').trim();
      const telefono = String(valores.telefono ?? '').trim();
      if (email) {
        payload.email = email;
      }
      if (password) {
        payload.password = password;
      }
      if (telefono) {
        payload.telefono = telefono;
      }

      console.log('📝 Editando técnico:', this.tecnicoEnEdicion.id_usuario_taller);
      this.tallerService.actualizarTecnico(this.tecnicoEnEdicion.id_usuario_taller, payload).subscribe({
        next: (data) => {
          const index = this.tecnicos.findIndex(t => t.id_usuario_taller === this.tecnicoEnEdicion?.id_usuario_taller);
          if (index !== -1) {
            this.tecnicos[index] = data;
          }
          this.exitoTecnico = '✅ Técnico actualizado correctamente';
          this.guardandoTecnico = false;
          setTimeout(() => {
            this.cerrarFormularioTecnico();
            this.exitoTecnico = null;
          }, 2000);
        },
        error: (err) => {
          this.errorTecnico = err.error?.detail || 'Error al actualizar técnico';
          this.guardandoTecnico = false;
        }
      });
    } else {
      const valores = this.formTecnico.value;
      const payload: TecnicoCreate = {
        nombre: String(valores.nombre ?? '').trim(),
        email: String(valores.email ?? '').trim(),
        password: String(valores.password ?? '').trim(),
      };
      const telefono = String(valores.telefono ?? '').trim();
      if (telefono) {
        payload.telefono = telefono;
      }

      console.log('➕ Agregando nuevo técnico');
      this.tallerService.agregarTecnico(payload).subscribe({
        next: (data) => {
          this.tecnicos.push(data);
          this.exitoTecnico = '✅ Técnico agregado correctamente';
          this.guardandoTecnico = false;
          setTimeout(() => {
            this.cerrarFormularioTecnico();
            this.exitoTecnico = null;
          }, 2000);
        },
        error: (err) => {
          this.errorTecnico = err.error?.detail || 'Error al agregar técnico';
          this.guardandoTecnico = false;
        }
      });
    }
  }

  editarTecnico(tecnico: Tecnico): void {
    console.log('✏️ Editando técnico:', tecnico);
    this.aplicarValidadoresTecnicoEdicion();
    this.tecnicoEnEdicion = tecnico;
    this.formTecnico.patchValue({
      nombre: tecnico.nombre,
      email: tecnico.email,
      telefono: tecnico.telefono,
      password: ''
    });
    this.mostrarFormularioTecnico = true;
    this.errorTecnico = null;
    this.exitoTecnico = null;
  }

  eliminarTecnico(tecnico: Tecnico): void {
    if (confirm(`¿Está seguro de que desea eliminar a ${tecnico.nombre}?`)) {
      console.log('🗑️ Eliminando técnico:', tecnico.id_usuario_taller);
      this.guardandoTecnico = true;
      this.tallerService.removerTecnico(tecnico.id_usuario_taller).subscribe({
        next: () => {
          this.tecnicos = this.tecnicos.filter(t => t.id_usuario_taller !== tecnico.id_usuario_taller);
          this.exitoTecnico = '✅ Técnico eliminado correctamente';
          this.guardandoTecnico = false;
          setTimeout(() => {
            this.exitoTecnico = null;
          }, 2000);
        },
        error: (err) => {
          this.errorTecnico = err.error?.detail || 'Error al eliminar técnico';
          this.guardandoTecnico = false;
        }
      });
    }
  }

  handleAction(action: string): void {
    if (action === 'technicians') {
      if (!this.mostrarTecnicos) {
        this.mostrarTecnicos = true;
        if (this.tecnicos.length === 0) {
          this.cargarTecnicos();
        }
      }
      const section = document.querySelector('.tecnicos-section');
      section?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'assignments') {
      this.router.navigate(['/dashboard/taller/solicitudes']);
    } else if (action === 'historial') {
      this.router.navigate(['/dashboard/taller/historial']);
    }
  }

  /**
   * B.3: alterna la disponibilidad del taller para recibir solicitudes.
   */
  toggleDisponibilidad(): void {
    console.log('[DashboardTaller] toggleDisponibilidad →', { disponible: !this.disponible });
    this.cambiandoDisponibilidad = true;

    this.tallerService.toggleDisponibilidad(!this.disponible).subscribe({
      next: (data) => {
        console.log('[DashboardTaller] toggleDisponibilidad ← OK', { disponible: data.disponible });
        this.disponible = data.disponible;
        this.taller = data;
        this.currentTaller = {
          ...(this.currentTaller ?? {} as TallerAuth),
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono ?? '',
          direccion: data.direccion ?? '',
        } as TallerAuth;
        this.exito = this.disponible ? '✅ Taller activo - recibiendo solicitudes' : '🔒 Taller en pausa - no recibirá solicitudes';
        this.cambiandoDisponibilidad = false;
        setTimeout(() => this.exito = null, 3000);
      },
      error: (err) => {
        console.error('[DashboardTaller] toggleDisponibilidad ← ERROR', err);
        this.error = err?.error?.detail || err?.message || 'Error al cambiar disponibilidad';
        this.cambiandoDisponibilidad = false;
      }
    });
  }

  // Gestión de servicios

  cargarCategorias(): void {
    this.tallerService.obtenerCategorias()
      .pipe(catchError(() => of([] as CategoriaDisponible[])))
      .subscribe(cats => { this.categorias = cats; this.cdr.markForCheck(); });
  }

  toggleServicios(): void {
    this.mostrarServicios = !this.mostrarServicios;
    if (this.mostrarServicios && this.misServicios.size === 0) {
      this.cargarMisServicios();
    }
    this.cdr.markForCheck();
  }

  cargarMisServicios(): void {
    this.cargandoServicios = true;
    this.tallerService.obtenerMisServicios()
      .pipe(catchError(() => of([] as ServicioTaller[])))
      .subscribe(servicios => {
        this.misServicios = new Set(servicios.map(s => s.id_categoria));
        this.cargandoServicios = false;
        this.cdr.markForCheck();
      });
  }

  toggleServicio(id: number): void {
    if (this.misServicios.has(id)) {
      this.misServicios.delete(id);
    } else {
      this.misServicios.add(id);
    }
  }

  tieneServicio(id: number): boolean {
    return this.misServicios.has(id);
  }

  guardarServicios(): void {
    this.guardandoServicios = true;
    this.tallerService.actualizarMisServicios(Array.from(this.misServicios))
      .subscribe({
        next: (servicios) => {
          this.misServicios = new Set(servicios.map(s => s.id_categoria));
          this.exito = '✅ Servicios actualizados correctamente';
          this.guardandoServicios = false;
          setTimeout(() => { this.exito = null; this.cdr.markForCheck(); }, 3000);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.detail || 'Error al actualizar servicios';
          this.guardandoServicios = false;
          this.cdr.markForCheck();
        },
      });
  }

  private inicioDelMes(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private fechaDeHoy(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private obtenerMontoAsignacion(asignacion: AsignacionTaller): number {
    const valor = asignacion.costo_final ?? asignacion.costo_estimado ?? 0;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(valor);
  }

  get gananciasMesFmt(): string {
    return this.formatearMoneda(this.gananciasMes);
  }

  get ticketPromedioMesFmt(): string {
    return this.formatearMoneda(this.ticketPromedioMes);
  }
}
