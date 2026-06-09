import {
  Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef,
  ElementRef, ViewChild, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import {
  AdminService, KpiResumenAdmin, KpiZona, TallerKpiRow, TallerRankingRow,
} from '../../../shared/services/admin.service';

Chart.register(...registerables);

type MetricaComp =
  | 'tiempo_asignacion_min'
  | 'tiempo_llegada_min'
  | 'total_incidentes'
  | 'casos_cancelados'
  | 'sla_porcentaje';

/**
 * Dashboard de KPIs del super-admin (rol 4): analitica operacional de toda la
 * plataforma, con filtros (taller/tenant, rango de fechas, umbral SLA) y varias
 * formas de visualizar (tarjetas, barras/dona, comparativa por taller con
 * selector de metrica, ranking y zonas). Todos los datos salen del backend.
 *
 * No reemplaza el panel de KPIs del taller (rol 2); es una vista adicional.
 */
@Component({
  selector: 'app-admin-kpis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-kpis.component.html',
  styleUrl: './admin-kpis.component.scss',
})
export class AdminKpisComponent implements OnInit, AfterViewInit, OnDestroy {
  private admin = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  @ViewChild('chartCat') chartCatRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartComp') chartCompRef?: ElementRef<HTMLCanvasElement>;
  private chartCat?: Chart;
  private chartComp?: Chart;

  // Filtros
  desde = '';
  hasta = '';
  idTenantSel: number | null = null;   // null = todos los talleres
  slaMin = 60;

  // Datos
  resumen: KpiResumenAdmin | null = null;
  porTaller: TallerKpiRow[] = [];
  ranking: TallerRankingRow[] = [];

  // Cache de direcciones por zona ("lat,lng" -> calle), resueltas con Nominatim.
  zonaDir = new Map<string, string>();

  // Vistas dinamicas
  tipoChartCat: 'bar' | 'doughnut' = 'bar';
  metricaComp: MetricaComp = 'tiempo_asignacion_min';
  tipoChartComp: 'bar' | 'line' = 'bar';

  cargando = true;
  error: string | null = null;

  readonly metricas: { val: MetricaComp; label: string }[] = [
    { val: 'tiempo_asignacion_min', label: 'Tiempo de asignacion (min)' },
    { val: 'tiempo_llegada_min', label: 'Tiempo de llegada (min)' },
    { val: 'total_incidentes', label: 'Total de incidentes' },
    { val: 'casos_cancelados', label: 'Casos cancelados' },
    { val: 'sla_porcentaje', label: 'Cumplimiento SLA (%)' },
  ];

  ngOnInit(): void {
    const ahora = new Date();
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.desde = hace30.toISOString().split('T')[0];
    this.hasta = ahora.toISOString().split('T')[0];
    this.cargar();
  }

  ngAfterViewInit(): void {
    if (this.resumen) this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chartCat?.destroy();
    this.chartComp?.destroy();
  }

  get tallerSelNombre(): string {
    if (this.idTenantSel == null) return 'Todos los talleres';
    const t = this.porTaller.find(x => x.id_tenant === this.idTenantSel);
    return t ? t.nombre : 'Taller seleccionado';
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    forkJoin({
      resumen: this.admin.getKpisResumen(this.desde, this.hasta, this.idTenantSel, this.slaMin),
      porTaller: this.admin.getKpisPorTaller(this.desde, this.hasta, this.slaMin).pipe(
        catchError(() => of([] as TallerKpiRow[]))
      ),
      ranking: this.admin.getRankingTalleres(this.desde, this.hasta, 10).pipe(
        catchError(() => of([] as TallerRankingRow[]))
      ),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
          setTimeout(() => this.renderCharts());
          this.resolverDirecciones();
        })
      )
      .subscribe({
        next: ({ resumen, porTaller, ranking }) => {
          this.resumen = resumen;
          this.porTaller = porTaller;
          this.ranking = ranking;
        },
        error: (e) => {
          this.error = e?.error?.detail ?? e?.message ?? 'Error cargando KPIs';
        },
      });
  }

  aplicarFiltros(): void {
    this.cargar();
  }

  setTipoChartCat(t: 'bar' | 'doughnut'): void {
    this.tipoChartCat = t;
    this.renderCat();
  }

  setTipoChartComp(t: 'bar' | 'line'): void {
    this.tipoChartComp = t;
    this.renderComp();
  }

  onMetricaChange(): void {
    this.renderComp();
  }

  metricaLabel(m: MetricaComp): string {
    return this.metricas.find(x => x.val === m)?.label ?? m;
  }

  // Devuelve la calle/zona ya resuelta (o '' si aun no se resolvio o fallo).
  direccionZona(z: KpiZona): string {
    return this.zonaDir.get(`${z.lat},${z.lng}`) ?? '';
  }

  // Convierte el lat/lng de cada zona en una direccion legible (calle + barrio)
  // con Nominatim (OSM). Secuencial y con pausa para respetar su limite de
  // 1 req/seg. Si falla, la zona queda con su etiqueta "Zona N".
  private async resolverDirecciones(): Promise<void> {
    if (!this.resumen) return;
    for (const z of this.resumen.zonas_mas_incidentes) {
      const key = `${z.lat},${z.lng}`;
      if (this.zonaDir.has(key)) continue;
      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
          `&lat=${z.lat}&lon=${z.lng}&zoom=17&addressdetails=1`;
        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
        if (resp.ok) {
          const j: any = await resp.json();
          const a = j?.address ?? {};
          const partes = [
            a.road ?? a.pedestrian ?? a.neighbourhood,
            a.suburb ?? a.city_district ?? a.city ?? a.town ?? a.village,
          ].filter(Boolean);
          const etiqueta = partes.length
            ? partes.join(', ')
            : (j?.display_name?.split(',').slice(0, 2).join(',').trim() ?? '');
          this.zonaDir.set(key, etiqueta);
        } else {
          this.zonaDir.set(key, '');
        }
      } catch {
        this.zonaDir.set(key, '');
      }
      this.cdr.markForCheck();
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  private renderCharts(): void {
    this.renderCat();
    this.renderComp();
  }

  private renderCat(): void {
    if (!this.resumen || !this.chartCatRef) return;
    this.chartCat?.destroy();

    const cats = this.resumen.incidentes_por_categoria;
    const colores = [
      '#4a90e2', '#e94e77', '#f5a623', '#7ed321', '#9013fe',
      '#50e3c2', '#b8e986', '#bd10e0', '#f8456b', '#417505',
    ];

    this.chartCat = new Chart(this.chartCatRef.nativeElement, {
      type: this.tipoChartCat,
      data: {
        labels: cats.map(c => c.nombre),
        datasets: [
          {
            label: 'Incidentes',
            data: cats.map(c => c.total),
            backgroundColor: this.tipoChartCat === 'doughnut' ? colores : '#4a90e2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: this.tipoChartCat === 'doughnut' } },
        scales: this.tipoChartCat === 'bar'
          ? { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
          : {},
      },
    });
  }

  private renderComp(): void {
    if (!this.chartCompRef) return;
    this.chartComp?.destroy();

    const rows = this.porTaller;
    const metrica = this.metricaComp;

    this.chartComp = new Chart(this.chartCompRef.nativeElement, {
      type: this.tipoChartComp,
      data: {
        labels: rows.map(r => r.nombre),
        datasets: [
          {
            label: this.metricaLabel(metrica),
            data: rows.map(r => Number(r[metrica] ?? 0)),
            backgroundColor: '#7ed321',
            borderColor: '#417505',
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}
