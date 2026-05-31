import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { TallerShellComponent } from './dashboards/taller/taller-shell.component';
import { DashboardTallerComponent } from './dashboards/taller/dashboard-taller.component';
import { DashboardAdminComponent } from './dashboards/admin/dashboard-admin.component';
import { SolicitudesComponent } from './dashboards/taller/solicitudes/solicitudes.component';
import { SolicitudDetalleComponent } from './dashboards/taller/solicitud-detalle/solicitud-detalle.component';
import { ResenasComponent } from './dashboards/taller/resenas/resenas.component';
import { HistorialComponent } from './dashboards/taller/historial/historial.component';
import { MensajesComponent } from './dashboards/taller/mensajes/mensajes.component';
import { ServiciosComponent } from './dashboards/taller/servicios/servicios.component';
import { CancelacionesComponent } from './dashboards/taller/cancelaciones/cancelaciones.component';
import { KpisComponent } from './dashboards/taller/kpis/kpis.component';
import { UnauthorizedComponent } from './shared/pages/unauthorized.component';
import { authGuard, tipoGuard, adminGuard, publicGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard]
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'taller',
        pathMatch: 'full'
      },
      {
        path: 'taller',
        component: TallerShellComponent,
        canActivate: [tipoGuard(['taller'])],
        children: [
          { path: '', redirectTo: 'inicio', pathMatch: 'full' },
          { path: 'inicio', component: DashboardTallerComponent },
          { path: 'solicitudes', component: SolicitudesComponent },
          { path: 'solicitudes/:id', component: SolicitudDetalleComponent },
          { path: 'resenas', component: ResenasComponent },
          { path: 'historial', component: HistorialComponent },
          { path: 'mensajes/:idIncidente', component: MensajesComponent },
          { path: 'servicios', component: ServiciosComponent },
          { path: 'cancelaciones', component: CancelacionesComponent },
          { path: 'kpis', component: KpisComponent },
        ]
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        component: DashboardAdminComponent
      }
    ]
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
