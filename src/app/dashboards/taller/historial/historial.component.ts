import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../../shared/services/http.service';
import { AsignacionTaller } from '../../../shared/models/asignacion.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="historial-container">
      <div class="historial-header">
        <h2>Historial de Atenciones</h2>
        <div class="filtros">
          <label>
            Desde:
            <input type="date" [(ngModel)]="filtroDesde" (change)="cargar()" />
          </label>
          <label>
            Hasta:
            <input type="date" [(ngModel)]="filtroHasta" (change)="cargar()" />
          </label>
        </div>
      </div>

      <div *ngIf="cargando" class="loading">Cargando historial...</div>
      <div *ngIf="error" class="error-msg">{{ error }}</div>

      <div *ngIf="!cargando && !error">
        <p class="total-text">
          {{ atenciones.length }} atenciones completadas
        </p>

        <div *ngIf="atenciones.length === 0" class="empty">
          No hay atenciones completadas en el período seleccionado.
        </div>

        <table *ngIf="atenciones.length > 0" class="tabla-historial">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Categoría</th>
              <th>Técnico</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of atenciones">
              <td>{{ a.id_asignacion }}</td>
              <td>{{ a.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ a.incidente.usuario.nombre ?? '—' }}</td>
              <td>{{ vehiculoLabel(a) }}</td>
              <td>{{ a.incidente.categoria.nombre ?? '—' }}</td>
              <td>{{ a.id_usuario ?? '—' }}</td>
              <td>
                <span class="badge completada">{{ a.estado.nombre }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="paginacion" *ngIf="totalPaginas > 1">
          <button (click)="cambiarPagina(paginaActual - 1)" [disabled]="paginaActual === 1">
            &#8592; Anterior
          </button>
          <span>Página {{ paginaActual }} / {{ totalPaginas }}</span>
          <button (click)="cambiarPagina(paginaActual + 1)" [disabled]="paginaActual === totalPaginas">
            Siguiente &#8594;
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .historial-container { padding: 24px; }
    .historial-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .historial-header h2 { margin: 0; }
    .filtros { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .filtros label { display: flex; flex-direction: column; font-size: 12px; gap: 4px; }
    .filtros input { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
    .loading, .error-msg, .empty { text-align: center; padding: 32px; color: #666; }
    .error-msg { color: #d32f2f; }
    .total-text { color: #666; font-size: 14px; margin-bottom: 12px; }
    .tabla-historial { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tabla-historial th, .tabla-historial td { padding: 10px 12px; border-bottom: 1px solid #eee; text-align: left; }
    .tabla-historial th { background: #f5f5f5; font-weight: 600; }
    .tabla-historial tr:hover td { background: #fafafa; }
    .badge { padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge.completada { background: #e8f5e9; color: #2e7d32; }
    .paginacion { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; }
    .paginacion button { padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: #fff; }
    .paginacion button:disabled { opacity: 0.4; cursor: default; }
  `]
})
export class HistorialComponent implements OnInit {
  atenciones: AsignacionTaller[] = [];
  cargando = false;
  error: string | null = null;
  paginaActual = 1;
  porPagina = 20;
  totalPaginas = 1;
  filtroDesde = '';
  filtroHasta = '';

  constructor(
    private http: HttpService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    console.log('[Historial] ngOnInit → cargar historial inicial');
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.cdr.detectChanges();

    let url = `/talleres/mi-taller/historial?pagina=${this.paginaActual}&por_pagina=${this.porPagina}`;
    if (this.filtroDesde) url += `&desde=${this.filtroDesde}`;
    if (this.filtroHasta) url += `&hasta=${this.filtroHasta}`;

    console.log('[Historial] cargar →', {
      pagina: this.paginaActual,
      porPagina: this.porPagina,
      filtroDesde: this.filtroDesde || null,
      filtroHasta: this.filtroHasta || null,
      url,
    });

    this.http.get<AsignacionTaller[]>(url).pipe(
      finalize(() => {
        this.cargando = false;
        console.log('[Historial] cargar → finalize');
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.atenciones = data;
        console.log('[Historial] cargar ← OK', {
          count: data.length,
          firstId: data[0]?.id_asignacion ?? null,
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.detail ?? 'Error al cargar el historial';
        console.error('[Historial] cargar ← ERROR', {
          status: err?.status ?? null,
          detail: err?.error?.detail ?? err?.message ?? err,
        });
        this.cdr.detectChanges();
      },
    });
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1) return;
    console.log('[Historial] cambiarPagina →', { paginaAnterior: this.paginaActual, paginaNueva: pagina });
    this.paginaActual = pagina;
    this.cargar();
  }

  vehiculoLabel(a: AsignacionTaller): string {
    const v = (a as any).incidente?.vehiculo;
    if (!v) return '—';
    return [v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || v.placa;
  }
}
