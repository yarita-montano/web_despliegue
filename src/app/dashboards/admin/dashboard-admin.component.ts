import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../shared/services/auth.service';
import { AdminService, GananciaMensualRow, TallerAdmin } from '../../shared/services/admin.service';
import { notificacion } from '../../shared/utils/notificacion.util';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AdminTalleresComponent } from './talleres/admin-talleres.component';
import { AdminGananciasComponent } from './ganancias/admin-ganancias.component';
import { AdminServiciosComponent } from './servicios/admin-servicios.component';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, AdminTalleresComponent, AdminGananciasComponent, AdminServiciosComponent],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.scss'
})
export class DashboardAdminComponent implements OnInit {
  currentUser: User | null = null;
  vistaActual: 'inicio' | 'talleres' | 'ganancias' | 'servicios' = 'inicio';
  statsLoading = false;

  stats = [
    { label: 'Total talleres', value: 0, icon: '🏢', format: 'number' as const },
    { label: 'Talleres activos', value: 0, icon: '✅', format: 'number' as const },
    { label: 'Comision anual', value: 0, icon: '💰', format: 'currency' as const },
    { label: 'Servicios anuales', value: 0, icon: '📦', format: 'number' as const },
  ];

  quickActions = [
    { icon: '🏢', label: 'Gestionar Talleres', action: 'talleres' },
    { icon: '🔧', label: 'Gestionar Servicios', action: 'servicios' },
    { icon: '📊', label: 'Reporte de Ganancias', action: 'ganancias' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.cargarStats();
  }

  private cargarStats(): void {
    this.statsLoading = true;
    const anioActual = new Date().getFullYear();

    console.log('[DashboardAdmin] cargarStats →', { anioActual });

    forkJoin({
      talleres: this.adminService.obtenerTalleres().pipe(
        catchError(() => of([] as TallerAdmin[]))
      ),
      mensual: this.adminService.obtenerGananciasMensual(anioActual).pipe(
        catchError(() => of([] as GananciaMensualRow[]))
      ),
    })
      .pipe(finalize(() => {
        this.statsLoading = false;
        console.log('[DashboardAdmin] cargarStats ← finalize');
        this.cdr.markForCheck();
      }))
      .subscribe(({ talleres, mensual }) => {
        const totalTalleres = talleres.length;
        const talleresActivos = talleres.filter(t => t.activo).length;
        const comisionAnio = mensual.reduce((s, f) => s + f.comision_plataforma, 0);
        const serviciosAnio = mensual.reduce((s, f) => s + f.total_pagos, 0);

        this.stats = [
          { label: 'Total talleres', value: totalTalleres, icon: '🏢', format: 'number' },
          { label: 'Talleres activos', value: talleresActivos, icon: '✅', format: 'number' },
          { label: 'Comision anual', value: comisionAnio, icon: '💰', format: 'currency' },
          { label: 'Servicios anuales', value: serviciosAnio, icon: '📦', format: 'number' },
        ];

        console.log('[DashboardAdmin] cargarStats ← OK', {
          totalTalleres,
          talleresActivos,
          comisionAnio,
          serviciosAnio,
        });

        this.cdr.markForCheck();

        if (talleres.length === 0 && mensual.length === 0) {
          notificacion('No hay datos para mostrar en stats', 'warning');
        }
      });
  }

  handleAction(action: string): void {
    console.log('[DashboardAdmin] handleAction →', { action, vistaActual: this.vistaActual });
    const mapa: Record<string, 'talleres' | 'ganancias' | 'servicios'> = {
      talleres: 'talleres',
      ganancias: 'ganancias',
      servicios: 'servicios',
      workshops: 'talleres',
      reports: 'ganancias',
    };

    const destino = mapa[action];
    if (destino) {
      console.log('[DashboardAdmin] handleAction ← set vistaActual', { destino });
      this.vistaActual = destino;
      return;
    }

    console.warn('[DashboardAdmin] handleAction ← action sin destino', { action, mapa: Object.keys(mapa) });
  }

  irAInicio(): void {
    this.vistaActual = 'inicio';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
