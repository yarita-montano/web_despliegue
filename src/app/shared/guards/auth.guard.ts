import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, TipoAuth } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getIsAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const tipoGuard = (tiposPermitidos: TipoAuth[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.getIsAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const tipo = authService.getTipo();
    if (tipo && tiposPermitidos.includes(tipo)) {
      return true;
    }

    router.navigate(['/unauthorized']);
    return false;
  };
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getIsAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.hasTipo('usuario') && authService.getUserRole() === 4) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getIsAuthenticated()) {
    const tipo = authService.getTipo();
    if (tipo === 'taller') {
      router.navigate(['/dashboard/taller']);
    } else if (tipo === 'usuario' && authService.getUserRole() === 4) {
      router.navigate(['/dashboard/admin']);
    } else {
      router.navigate(['/unauthorized']);
    }
    return false;
  }
  return true;
};
