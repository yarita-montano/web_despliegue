import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, GananciaMensualRow, GananciaTallerRow } from '../../../shared/services/admin.service';
import { notificacion } from '../../../shared/utils/notificacion.util';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-ganancias',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe],
  templateUrl: './admin-ganancias.component.html',
  styleUrl: './admin-ganancias.component.scss'
})
export class AdminGananciasComponent implements OnInit, OnDestroy {
  gananciasMensual: GananciaMensualRow[] = [];
  gananciaPorTaller: GananciaTallerRow[] = [];

  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1;

  cargando: boolean = false;
  vistaActual: 'mensual' | 'taller' = 'mensual';

  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarGanancias();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarGanancias(): void {
    this.cargando = true;
    console.log('[AdminGanancias] cargarGanancias →', { vistaActual: this.vistaActual, anio: this.anio, mes: this.mes });
    if (this.vistaActual === 'mensual') {
      this.cargarGananciasMensual();
    } else {
      this.cargarGananciaPorTaller();
    }
  }

  private cargarGananciasMensual(): void {
    this.adminService.obtenerGananciasMensual(this.anio)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cargando = false;
          console.log('[AdminGanancias] mensual ← finalize');
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (filas) => {
          this.gananciasMensual = filas;
          console.log('[AdminGanancias] mensual ← OK', { count: filas.length });
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[AdminGanancias] mensual ← ERROR', err);
          notificacion('Error al cargar ganancias mensuales', 'error');
          this.cdr.markForCheck();
        }
      });
  }

  private cargarGananciaPorTaller(): void {
    this.adminService.obtenerGananciaPorTaller({ anio: this.anio, mes: this.mes })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cargando = false;
          console.log('[AdminGanancias] taller ← finalize');
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (filas) => {
          this.gananciaPorTaller = filas;
          console.log('[AdminGanancias] taller ← OK', { count: filas.length });
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[AdminGanancias] taller ← ERROR', err);
          notificacion('Error al cargar ganancias por taller', 'error');
          this.cdr.markForCheck();
        }
      });
  }

  cambiarVista(vista: 'mensual' | 'taller'): void {
    this.vistaActual = vista;
    this.cargarGanancias();
  }

  // ── Totales calculados en el componente ────────────────────────────────────

  get totalComisionMensual(): number {
    return this.gananciasMensual.reduce((s, f) => s + f.comision_plataforma, 0);
  }

  get totalServiciosMensual(): number {
    return this.gananciasMensual.reduce((s, f) => s + f.total_pagos, 0);
  }

  get totalComisionTaller(): number {
    return this.gananciaPorTaller.reduce((s, f) => s + f.comision_plataforma, 0);
  }

  get totalServiciosTaller(): number {
    return this.gananciaPorTaller.reduce((s, f) => s + f.total_pagos, 0);
  }

  get promedioRating(): number {
    const con = this.gananciaPorTaller.filter(f => f.promedio_estrellas != null);
    if (con.length === 0) return 0;
    return con.reduce((s, f) => s + (f.promedio_estrellas ?? 0), 0) / con.length;
  }
}
