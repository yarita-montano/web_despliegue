import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { DashboardTallerComponent } from './dashboards/taller/dashboard-taller.component';
import { DashboardAdminComponent } from './dashboards/admin/dashboard-admin.component';
import { SolicitudesComponent } from './dashboards/taller/solicitudes/solicitudes.component';
import { SolicitudDetalleComponent } from './dashboards/taller/solicitud-detalle/solicitud-detalle.component';
import { ResenasComponent } from './dashboards/taller/resenas/resenas.component';
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
        path: 'taller',
        canActivate: [tipoGuard(['taller'])],
        children: [
          { path: '', component: DashboardTallerComponent },
          { path: 'solicitudes', component: SolicitudesComponent },
          { path: 'solicitudes/:id', component: SolicitudDetalleComponent },
          { path: 'resenas', component: ResenasComponent }
        ]
      },
      {
        path: 'admin',
        component: DashboardAdminComponent,
        canActivate: [adminGuard]
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
