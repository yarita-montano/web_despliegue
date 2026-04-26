import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpService } from '../../../shared/services/http.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface Mensaje {
  id_mensaje: number;
  id_incidente: number;
  id_usuario?: number;
  id_taller?: number;
  contenido: string;
  leido: boolean;
  created_at: string;
}

@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mensajes-container">
      <div class="mensajes-header">
        <h2>Mensajes — Incidente #{{ idIncidente }}</h2>
      </div>

      <div *ngIf="cargando && mensajes.length === 0" class="loading">
        Cargando mensajes...
      </div>
      <div *ngIf="error" class="error-msg">{{ error }}</div>

      <div class="chat-box" #chatBox>
        <div
          *ngFor="let m of mensajes"
          class="mensaje"
          [class.enviado]="m.id_taller != null"
          [class.recibido]="m.id_usuario != null"
        >
          <span class="autor">{{ m.id_taller != null ? 'Tú (Taller)' : 'Cliente' }}</span>
          <p class="contenido">{{ m.contenido }}</p>
          <span class="hora">{{ m.created_at | date:'HH:mm dd/MM' }}</span>
        </div>

        <div *ngIf="!cargando && mensajes.length === 0" class="empty">
          No hay mensajes aún. Escribe el primero.
        </div>
      </div>

      <div class="input-area">
        <textarea
          [(ngModel)]="nuevoMensaje"
          placeholder="Escribe un mensaje..."
          rows="2"
          (keydown.enter)="onEnter($event)"
        ></textarea>
        <button (click)="enviar()" [disabled]="enviando || !nuevoMensaje.trim()">
          {{ enviando ? 'Enviando...' : 'Enviar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mensajes-container { display: flex; flex-direction: column; height: calc(100vh - 120px); padding: 16px; gap: 12px; }
    .mensajes-header h2 { margin: 0; }
    .loading, .error-msg, .empty { text-align: center; padding: 32px; color: #666; }
    .error-msg { color: #d32f2f; }
    .chat-box { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid #eee; border-radius: 8px; background: #fafafa; }
    .mensaje { max-width: 70%; padding: 10px 14px; border-radius: 12px; display: flex; flex-direction: column; gap: 2px; }
    .mensaje.enviado { align-self: flex-end; background: #1976d2; color: #fff; }
    .mensaje.recibido { align-self: flex-start; background: #fff; border: 1px solid #ddd; }
    .autor { font-size: 11px; font-weight: 600; opacity: 0.75; }
    .contenido { margin: 0; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .hora { font-size: 10px; opacity: 0.6; align-self: flex-end; }
    .input-area { display: flex; gap: 8px; align-items: flex-end; }
    .input-area textarea { flex: 1; resize: none; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
    .input-area button { padding: 10px 20px; background: #1976d2; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .input-area button:disabled { opacity: 0.5; cursor: default; }
  `]
})
export class MensajesComponent implements OnInit, OnDestroy {
  idIncidente = 0;
  mensajes: Mensaje[] = [];
  nuevoMensaje = '';
  cargando = false;
  enviando = false;
  error: string | null = null;

  private _pollSub?: Subscription;

  constructor(
    private http: HttpService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.idIncidente = Number(this.route.snapshot.paramMap.get('idIncidente') ?? 0);
    if (this.idIncidente) {
      this.cargar();
      // Polling cada 10 segundos para nuevos mensajes
      this._pollSub = interval(10_000)
        .pipe(switchMap(() => this.http.get<Mensaje[]>(`/mensajes/${this.idIncidente}/taller`)))
        .subscribe({ next: (data) => (this.mensajes = data) });
    }
  }

  ngOnDestroy(): void {
    this._pollSub?.unsubscribe();
  }

  cargar(): void {
    this.cargando = true;
    this.http.get<Mensaje[]>(`/mensajes/${this.idIncidente}/taller`).subscribe({
      next: (data) => {
        this.mensajes = data;
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.detail ?? 'Error al cargar mensajes';
        this.cargando = false;
      },
    });
  }

  enviar(): void {
    const contenido = this.nuevoMensaje.trim();
    if (!contenido || this.enviando) return;

    this.enviando = true;
    this.http
      .post<Mensaje>(`/mensajes/${this.idIncidente}/taller`, { contenido })
      .subscribe({
        next: (nuevo) => {
          this.mensajes.push(nuevo);
          this.nuevoMensaje = '';
          this.enviando = false;
        },
        error: (err) => {
          this.error = err?.error?.detail ?? 'Error al enviar mensaje';
          this.enviando = false;
        },
      });
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;

    keyboardEvent.preventDefault();
    this.enviar();
  }
}
