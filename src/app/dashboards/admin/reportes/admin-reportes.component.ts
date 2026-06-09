import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import {
  ReportesService,
  NlReporteResponse,
  EjecutarReporteResponse,
} from '../../../shared/services/reportes.service';
import { VozService } from '../../../shared/services/voz.service';
import { notificacion } from '../../../shared/utils/notificacion.util';

/**
 * Asistente de reportes en lenguaje natural (super-admin, rol 4).
 *
 * El admin escribe o dicta una petición; Gemini (backend) la mapea a uno de los
 * reportes predefinidos del catálogo. Flujo: interpretar -> previsualizar tabla
 * -> exportar a PDF/Excel (archivos generados en el backend). Estado con signals;
 * el dictado por voz usa callbacks asíncronos.
 */
@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reportes.component.html',
  styleUrl: './admin-reportes.component.scss',
})
export class AdminReportesComponent {
  private reportes = inject(ReportesService);
  readonly voz = inject(VozService);

  readonly texto = signal('');
  readonly interpretando = signal(false);
  readonly ejecutando = signal(false);
  readonly exportando = signal<'pdf' | 'excel' | null>(null);
  readonly spec = signal<NlReporteResponse | null>(null);
  readonly resultado = signal<EjecutarReporteResponse | null>(null);
  readonly error = signal<string | null>(null);

  readonly ejemplos = [
    'Incidentes del último mes por taller',
    'Zonas con más averías en mayo',
    'Cumplimiento de SLA del periodo',
    'Ranking de mejores talleres',
    'Ganancias por mes de este año',
    'Incidentes por categoría',
  ];

  dictar(): void {
    this.error.set(null);
    this.voz
      .dictar()
      .then((t) => {
        if (t) {
          this.texto.set(t);
          this.interpretar();
        }
      })
      .catch((e) => this.error.set(e?.message ?? 'No se pudo usar el micrófono'));
  }

  usarEjemplo(frase: string): void {
    this.texto.set(frase);
    this.interpretar();
  }

  interpretar(): void {
    const t = this.texto().trim();
    if (!t) return;
    this.error.set(null);
    this.spec.set(null);
    this.resultado.set(null);
    this.interpretando.set(true);

    this.reportes.interpretar(t).subscribe({
      next: (r) => {
        this.interpretando.set(false);
        this.spec.set(r);
        if (r.report_id) this.ejecutar();
      },
      error: (e) => {
        this.interpretando.set(false);
        this.error.set(this.msg(e));
      },
    });
  }

  ejecutar(): void {
    const s = this.spec();
    if (!s?.report_id) return;
    this.ejecutando.set(true);

    this.reportes.ejecutar(s.report_id, s.params).subscribe({
      next: (r) => {
        this.ejecutando.set(false);
        this.resultado.set(r);
      },
      error: (e) => {
        this.ejecutando.set(false);
        this.error.set(this.msg(e));
      },
    });
  }

  exportar(formato: 'pdf' | 'excel'): void {
    const s = this.spec();
    if (!s?.report_id) return;
    if (!navigator.onLine) {
      notificacion('Sin conexión: la exportación requiere red', 'warning');
      return;
    }
    this.exportando.set(formato);

    this.reportes.exportar(s.report_id, formato, s.params).subscribe({
      next: (resp) => {
        this.exportando.set(null);
        this.descargar(resp, s.report_id!, formato);
      },
      error: (e) => {
        this.exportando.set(null);
        this.error.set(this.msg(e));
      },
    });
  }

  private descargar(
    resp: HttpResponse<Blob>,
    reportId: string,
    formato: 'pdf' | 'excel',
  ): void {
    const blob = resp.body;
    if (!blob) {
      this.error.set('Respuesta vacía del servidor');
      return;
    }
    // Si el backend devolvió un error JSON disfrazado de blob, mostrarlo.
    if (blob.type && blob.type.includes('application/json')) {
      blob.text().then((txt) => {
        try {
          this.error.set(JSON.parse(txt)?.detail ?? 'Error al exportar el reporte');
        } catch {
          this.error.set('Error al exportar el reporte');
        }
      });
      return;
    }

    const ext = formato === 'excel' ? 'xlsx' : 'pdf';
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let filename = `reporte_${reportId}_${fecha}.${ext}`;
    const cd = resp.headers.get('Content-Disposition');
    if (cd) {
      const m = /filename="?([^"]+)"?/.exec(cd);
      if (m) filename = m[1];
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notificacion('Reporte descargado', 'success');
  }

  private msg(e: any): string {
    return e?.error?.detail ?? e?.message ?? 'Ocurrió un error';
  }
}
