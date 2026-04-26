import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, TallerAuth } from '../../shared/services/auth.service';
import { TallerService, Taller, Tecnico, TecnicoCreate, TecnicoUpdate } from '../../shared/services/taller.service';
import { AsignacionesService } from '../../shared/services/asignaciones.service';
import { AsignacionTaller } from '../../shared/models/asignacion.model';
import { EvaluacionResponse } from '../../shared/models/evaluacion.model';
import { NotificacionService, Notificacion } from '../../shared/services/notificacion.service';
import { Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

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

  solicitudesPendientes: AsignacionTaller[] = [];
  cargandoSolicitudes = false;
  errorSolicitudes: string | null = null;

  mostrarInfoTaller = false;
  cargandoInfoTaller = false;

  mostrarTecnicos = false;
  cargandoTecnicos = false;

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

  notificaciones: Notificacion[] = [];
  notificacionesNoLeidas = 0;
  mostrarNotificaciones = false;
  private _notifSub?: Subscription;

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
    private notifService: NotificacionService,
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
    this.cargarNotificaciones();
    this.notifService.initFirebase();
    // Poll notificaciones cada 30s
    this._notifSub = interval(30_000)
      .pipe(switchMap(() => this.notifService.getMisNotificaciones()))
      .subscribe(data => {
        this.notificaciones = data;
        this.notificacionesNoLeidas = data.filter(n => !n.leido).length;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this._notifSub?.unsubscribe();
  }

  cargarNotificaciones(): void {
    this.notifService.getMisNotificaciones().subscribe({
      next: (data) => {
        this.notificaciones = data;
        this.notificacionesNoLeidas = data.filter(n => !n.leido).length;
        this.cdr.markForCheck();
      }
    });
  }

  toggleNotificaciones(): void {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
  }

  marcarLeida(id: number): void {
    this.notifService.marcarLeida(id).subscribe(() => {
      const n = this.notificaciones.find(x => x.id_notificacion === id);
      if (n) n.leido = true;
      this.notificacionesNoLeidas = this.notificaciones.filter(x => !x.leido).length;
      this.cdr.markForCheck();
    });
  }

  irAHistorial(): void {
    this.router.navigate(['/dashboard/taller/historial']);
  }

  irAMensajes(idIncidente: number): void {
    this.router.navigate(['/dashboard/taller/mensajes', idIncidente]);
  }

  cargarSolicitudesPendientes(): void {
    console.log('[DashboardTaller] cargarSolicitudesPendientes → estado=pendiente', {
      tipoAuth: localStorage.getItem('tipo'),
      hasToken: !!localStorage.getItem('access_token')
    });
    this.cargandoSolicitudes = true;
    this.errorSolicitudes = null;
    this.asignacionesService.listar({ estado: 'pendiente' }).subscribe({
      next: (data) => {
        console.log('[DashboardTaller] cargarSolicitudesPendientes ← OK', { count: data.length, data });
        this.solicitudesPendientes = data;
        this.cdr.markForCheck(); // Forzar detección de cambios
        this.cargandoSolicitudes = false;
      },
      error: (err) => {
        console.error('[DashboardTaller] cargarSolicitudesPendientes ← ERROR', err);
        this.errorSolicitudes = err?.error?.detail || err?.message || 'Error al cargar solicitudes';
        this.cargandoSolicitudes = false;
        this.cdr.markForCheck();
      }
    });
  }

  cargarResumenDashboard(): void {
    console.log('[DashboardTaller] cargarResumenDashboard →');
    this.cargandoResumen = true;
    this.cargandoSolicitudes = true;
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
        this.cargandoSolicitudes = false;
        this.cargandoTecnicos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[DashboardTaller] cargarResumenDashboard ← ERROR', err);
        this.error = err?.error?.detail || err?.message || 'Error al cargar métricas del dashboard';
        this.cargandoResumen = false;
        this.cargandoSolicitudes = false;
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
      const section = document.querySelector('.tecnicos-section');
      section?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'assignments') {
      this.router.navigate(['/dashboard/taller/solicitudes']);
    } else if (action === 'historial') {
      this.router.navigate(['/dashboard/taller/historial']);
    }
  }

  /**
   * NUEVO — B.3: Toggle disponibilidad del taller
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private inicioDelMes(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private fechaDeHoy(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
