import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../shared/services/auth.service';
import { ConnectionBadgeComponent } from '../../shared/components/connection-badge.component';
import { NotificacionService, Notificacion } from '../../shared/services/notificacion.service';

@Component({
  selector: 'app-taller-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ConnectionBadgeComponent],
  templateUrl: './taller-shell.component.html',
  styleUrl: './taller-shell.component.scss',
})
export class TallerShellComponent implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  notificacionesNoLeidas = 0;
  mostrarNotificaciones = false;

  private _notifSub?: Subscription;

  constructor(
    private authService: AuthService,
    private notifService: NotificacionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
    this.notifService.initFirebase();
    this._notifSub = interval(30_000)
      .pipe(switchMap(() => this.notifService.getMisNotificaciones().pipe(catchError(() => of([] as Notificacion[])))))
      .subscribe(data => {
        this.notificaciones = data;
        this.notificacionesNoLeidas = data.filter(n => !n.leido).length;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this._notifSub?.unsubscribe();
  }

  private cargarNotificaciones(): void {
    this.notifService.getMisNotificaciones()
      .pipe(catchError(() => of([] as Notificacion[])))
      .subscribe(data => {
        this.notificaciones = data;
        this.notificacionesNoLeidas = data.filter(n => !n.leido).length;
        this.cdr.markForCheck();
      });
  }

  toggleNotificaciones(): void {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
  }

  marcarLeida(id: number): void {
    this.notifService.marcarLeida(id).subscribe(() => {
      const n = this.notificaciones.find(x => x.id_notificacion === id);
      if (n) n.leido = true;
      this.notificacionesNoLeidas = this.notificaciones.filter(x => !x.leido).length;
      this.cdr.markForCheck();
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
