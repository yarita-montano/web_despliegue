import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ServiciosService, Categoria, TallerServicio } from './servicios.service';

interface FilaServicio {
  categoria: Categoria;
  activo: boolean;
  tarifa_base: number | null;
  tiempo_estimado_min: number | null;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './servicios.component.html',
  styleUrls: ['./servicios.component.scss'],
})
export class ServiciosComponent implements OnInit {
  private svc = inject(ServiciosService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  filas: FilaServicio[] = [];
  cargando = true;
  guardando = false;
  mensaje: string | null = null;
  error: string | null = null;

  tarifaKm: number = 0;
  guardandoTarifa = false;

  ngOnInit(): void {
    this.cargar();
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller/inicio']);
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    console.log('[Servicios] cargar →');
    forkJoin({
      categorias: this.svc.listarCategorias(),
      mios: this.svc.listarMisServicios(),
      taller: this.svc.obtenerMiTaller(),
    }).subscribe({
      next: ({ categorias, mios, taller }) => {
        console.log(`[Servicios] cargar ← OK categorias=${categorias.length} mios=${mios.length}`);
        const mioPorCat = new Map(mios.map(m => [m.id_categoria, m]));
        this.filas = categorias.map(cat => {
          const m = mioPorCat.get(cat.id_categoria);
          return {
            categoria: cat,
            activo: !!m,
            tarifa_base: m?.tarifa_base ?? null,
            tiempo_estimado_min: m?.tiempo_estimado_min ?? null,
          };
        });
        this.tarifaKm = Number(taller?.tarifa_traslado ?? 0);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('[Servicios] cargar ← ERROR', { status: e?.status, detail: e?.error?.detail, message: e?.message });
        this.error = 'Error cargando datos: ' + (e?.error?.detail ?? e?.message ?? 'Error');
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  guardar(): void {
    const servicios: TallerServicio[] = this.filas
      .filter(f => f.activo)
      .map(f => ({
        id_categoria: f.categoria.id_categoria,
        tarifa_base: f.tarifa_base ?? undefined,
        tiempo_estimado_min: f.tiempo_estimado_min ?? undefined,
      }));

    this.guardando = true;
    this.mensaje = null;
    this.error = null;
    this.svc.guardarServicios(servicios).subscribe({
      next: () => {
        this.mensaje = `Guardado: ${servicios.length} servicio(s) activos`;
        this.guardando = false;
      },
      error: (e) => {
        this.error = e?.error?.detail ?? e?.message ?? 'Error guardando';
        this.guardando = false;
      },
    });
  }

  guardarTarifaKm(): void {
    if (this.tarifaKm < 0) {
      this.error = 'La tarifa por km no puede ser negativa';
      return;
    }
    this.guardandoTarifa = true;
    this.mensaje = null;
    this.error = null;
    this.svc.actualizarTarifaKm(this.tarifaKm).subscribe({
      next: (r) => {
        this.tarifaKm = Number(r.tarifa_traslado ?? this.tarifaKm);
        this.mensaje = `Tarifa por km actualizada a $${this.tarifaKm.toFixed(2)}`;
        this.guardandoTarifa = false;
      },
      error: (e) => {
        this.error = e?.error?.detail ?? e?.message ?? 'Error guardando tarifa';
        this.guardandoTarifa = false;
      },
    });
  }
}
