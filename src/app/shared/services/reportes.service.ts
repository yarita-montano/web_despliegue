import { Injectable, inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

/** Parametros del reporte (coinciden con ReporteParams del backend). */
export interface ReporteParams {
  desde?: string | null;
  hasta?: string | null;
  id_tenant?: number | null;
  sla_minutos?: number | null;
  limite?: number | null;
  anio?: number | null;
  mes?: number | null;
}

/** Respuesta de /interpretar. Si report_id es null, hay aclaracion + sugerencias. */
export interface NlReporteResponse {
  report_id: string | null;
  titulo: string | null;
  params: ReporteParams;
  confianza: number;
  aclaracion: string | null;
  sugerencias: string[] | null;
}

/** Respuesta tabular de /ejecutar. */
export interface EjecutarReporteResponse {
  report_id: string;
  titulo: string;
  columnas: string[];
  filas: Record<string, any>[];
  params_aplicados: ReporteParams;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpService);
  private base = '/admin/reportes';

  interpretar(texto: string): Observable<NlReporteResponse> {
    return this.http.post<NlReporteResponse>(`${this.base}/interpretar`, { texto });
  }

  ejecutar(reportId: string, params: ReporteParams): Observable<EjecutarReporteResponse> {
    return this.http.post<EjecutarReporteResponse>(`${this.base}/ejecutar`, {
      report_id: reportId,
      params,
    });
  }

  exportar(
    reportId: string,
    formato: 'pdf' | 'excel',
    params: ReporteParams,
  ): Observable<HttpResponse<Blob>> {
    return this.http.postBlob(`${this.base}/exportar`, {
      report_id: reportId,
      formato,
      params,
    });
  }
}
