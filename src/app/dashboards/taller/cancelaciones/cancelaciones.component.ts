import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CancelacionesService, AsignacionCancelada, TenantCancelacionConfig } from './cancelaciones.service';

@Component({
  selector: 'app-cancelaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './cancelaciones.component.html',
  styleUrls: ['./cancelaciones.component.scss'],
})
export class CancelacionesComponent implements OnInit {
  private svc = inject(CancelacionesService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  lista: AsignacionCancelada[] = [];
  tarifaActual = 0;
  nuevaTarifa = 0;
  cargando = true;
  guardandoTarifa = false;
  msgTarifa: string | null = null;

  pctConfig: TenantCancelacionConfig = {
    pct_cancel_pendiente: 0,
    pct_cancel_aceptada: 50,
    pct_cancel_en_camino: 100,
  };
  guardandoPct = false;
  msgPct: string | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller/inicio']);
  }

  cargar(): void {
    this.cargando = true;
    this.svc.misCanceladas().subscribe({
      next: (data) => {
        this.lista = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });

    this.svc.miTaller().subscribe({
      next: (t) => {
        this.tarifaActual = Number(t.tarifa_traslado);
        this.nuevaTarifa = this.tarifaActual;
        this.cdr.detectChanges();
      },
    });

    this.svc.miTenant().subscribe({
      next: (t) => {
        this.pctConfig = {
          pct_cancel_pendiente: t.pct_cancel_pendiente,
          pct_cancel_aceptada: t.pct_cancel_aceptada,
          pct_cancel_en_camino: t.pct_cancel_en_camino,
        };
        this.cdr.detectChanges();
      },
    });
  }

  guardarTarifa(): void {
    this.guardandoTarifa = true;
    this.msgTarifa = null;
    this.svc.actualizarTarifa(this.nuevaTarifa).subscribe({
      next: () => {
        this.tarifaActual = this.nuevaTarifa;
        this.msgTarifa = 'Tarifa actualizada';
        this.guardandoTarifa = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.msgTarifa = e?.error?.detail ?? e?.message ?? 'Error';
        this.guardandoTarifa = false;
        this.cdr.detectChanges();
      },
    });
  }

  guardarPorcentajes(): void {
    const c = this.pctConfig;
    if ([c.pct_cancel_pendiente, c.pct_cancel_aceptada, c.pct_cancel_en_camino].some(
      v => v < 0 || v > 100,
    )) {
      this.msgPct = 'Los porcentajes deben estar entre 0 y 100';
      return;
    }
    this.guardandoPct = true;
    this.msgPct = null;
    this.svc.actualizarPorcentajes(this.pctConfig).subscribe({
      next: (t) => {
        this.pctConfig = {
          pct_cancel_pendiente: t.pct_cancel_pendiente,
          pct_cancel_aceptada: t.pct_cancel_aceptada,
          pct_cancel_en_camino: t.pct_cancel_en_camino,
        };
        this.msgPct = 'Porcentajes actualizados';
        this.guardandoPct = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.msgPct = e?.error?.detail ?? e?.message ?? 'Error guardando';
        this.guardandoPct = false;
        this.cdr.detectChanges();
      },
    });
  }

  get totalPendiente(): number {
    return this.lista
      .filter(a => !a.compensacion_pagada && a.compensacion_monto)
      .reduce((sum, a) => sum + Number(a.compensacion_monto), 0);
  }

  get totalCancelaciones(): number {
    return this.lista.length;
  }
}
