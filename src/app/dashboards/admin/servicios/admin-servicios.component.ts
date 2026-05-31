import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService, CategoriaAdmin } from '../../../shared/services/admin.service';
import { notificacion } from '../../../shared/utils/notificacion.util';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-servicios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-servicios.component.html',
  styleUrl: './admin-servicios.component.scss'
})
export class AdminServiciosComponent implements OnInit, OnDestroy {
  servicios: CategoriaAdmin[] = [];
  cargando = false;
  mostrarFormulario = false;
  guardando = false;
  form!: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre:      ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.adminService.obtenerCategorias()
      .pipe(takeUntil(this.destroy$), finalize(() => { this.cargando = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (datos) => { this.servicios = datos; this.cdr.markForCheck(); },
        error: () => notificacion('Error al cargar servicios', 'error'),
      });
  }

  abrirFormulario(): void {
    this.mostrarFormulario = true;
    this.form.reset();
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    this.adminService.crearCategoria(this.form.value)
      .pipe(takeUntil(this.destroy$), finalize(() => { this.guardando = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (nuevo) => {
          this.servicios = [...this.servicios, nuevo];
          this.mostrarFormulario = false;
          this.form.reset();
          notificacion(`Servicio "${nuevo.nombre}" creado`, 'success');
          this.cdr.markForCheck();
        },
        error: (err) => notificacion(err?.error?.detail ?? 'Error al crear servicio', 'error'),
      });
  }
}
