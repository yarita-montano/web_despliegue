import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TallerService } from '../../../shared/services/taller.service';
import { EvaluacionResponse } from '../../../shared/models/evaluacion.model';

@Component({
  selector: 'app-resenas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resenas.component.html',
  styleUrl: './resenas.component.scss'
})
export class ResenasComponent implements OnInit {
  evaluaciones: EvaluacionResponse[] = [];
  cargando = false;
  error: string | null = null;
  promedio = 0;
  totalEstrellas = 0;
  Math = Math; // Para usar Math en el template

  constructor(
    private tallerService: TallerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarEvaluaciones();
  }

  cargarEvaluaciones(): void {
    console.log('[ResenasComponent] cargarEvaluaciones →');
    this.cargando = true;
    this.error = null;

    this.tallerService.obtenerEvaluaciones().subscribe({
      next: (data) => {
        console.log('[ResenasComponent] cargarEvaluaciones ← OK', { count: data.length });
        this.evaluaciones = data;

        if (data.length > 0) {
          this.totalEstrellas = data.reduce((sum, e) => sum + e.estrellas, 0);
          this.promedio = this.totalEstrellas / data.length;
        }

        this.cargando = false;
      },
      error: (err) => {
        console.error('[ResenasComponent] cargarEvaluaciones ← ERROR', err);
        this.error = err?.error?.detail || err?.message || 'Error al cargar reseñas';
        this.cargando = false;
      }
    });
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller']);
  }

  renderStars(estrellas: number): string {
    return '★'.repeat(estrellas) + '☆'.repeat(5 - estrellas);
  }

  getColorClase(estrellas: number): string {
    if (estrellas >= 4) return 'excelente';
    if (estrellas === 3) return 'bueno';
    return 'mejorable';
  }
}
