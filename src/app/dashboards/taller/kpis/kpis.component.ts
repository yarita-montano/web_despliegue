import { ChangeDetectorRef, Component, OnInit, AfterViewInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { KpisService, KpiResumen } from './kpis.service';

Chart.register(...registerables);

@Component({
  selector: 'app-kpis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kpis.component.html',
  styleUrls: ['./kpis.component.scss'],
})
export class KpisComponent implements OnInit, AfterViewInit {
  private svc = inject(KpisService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  volver(): void {
    this.router.navigate(['/dashboard/taller/inicio']);
  }

  @ViewChild('chartCat') chartCatRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  data: KpiResumen | null = null;
  cargando = true;
  error: string | null = null;

  desde = '';
  hasta = '';

  ngOnInit(): void {
    const ahora = new Date();
    const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.desde = hace30.toISOString().split('T')[0];
    this.hasta = ahora.toISOString().split('T')[0];
    this.cargar();
  }

  ngAfterViewInit(): void {
    if (this.data) this.renderChart();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.svc.resumen(this.desde, this.hasta).subscribe({
      next: (d) => {
        this.data = d;
        this.cargando = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderChart());
      },
      error: (e) => {
        this.error = e?.error?.detail ?? e?.message ?? 'Error cargando KPIs';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  private renderChart(): void {
    if (!this.data || !this.chartCatRef) return;
    if (this.chart) this.chart.destroy();

    const ctx = this.chartCatRef.nativeElement;
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.data.incidentes_por_categoria.map(c => c.nombre),
        datasets: [
          {
            label: 'Incidentes',
            data: this.data.incidentes_por_categoria.map(c => c.total),
            backgroundColor: '#4a90e2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });
  }
}
