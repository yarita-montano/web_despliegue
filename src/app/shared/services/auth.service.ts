import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export type TipoAuth = 'taller' | 'usuario';

export interface User {
  id_usuario: number;
  id_rol: number;
  nombre: string;
  email: string;
  telefono?: string;
  activo: boolean;
  created_at: string;
}

export interface TallerAuth {
  id_taller: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  capacidad_max?: number;
  activo: boolean;
  verificado: boolean;
  created_at: string;
}

export interface LoginTallerResponse {
  access_token: string;
  token_type: string;
  taller: TallerAuth;
}

export interface LoginAdminResponse {
  access_token: string;
  token_type: string;
  usuario: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private currentUser$ = new BehaviorSubject<User | null>(null);
  private currentTaller$ = new BehaviorSubject<TallerAuth | null>(null);
  private isAuthenticated$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.checkExistingToken();
  }

  private checkExistingToken(): void {
    const token = this.getToken();
    if (!token) return;

    // Si el JWT está expirado, limpiar sesión local para evitar 401 al primer request.
    if (this.isTokenExpired(token)) {
      this.logout();
      return;
    }

    this.isAuthenticated$.next(true);
    const tipo = this.getTipo();
    if (tipo === 'taller') {
      const taller = this.getStoredTaller();
      if (taller) this.currentTaller$.next(taller);
    } else if (tipo === 'usuario') {
      const user = this.getStoredUser();
      if (user) this.currentUser$.next(user);
    }
  }

  loginTaller(email: string, password: string): Observable<LoginTallerResponse> {
    return this.http
      .post<LoginTallerResponse>(`${this.baseUrl}/talleres/login`, { email, password })
      .pipe(
        tap(res => {
          console.log('[AuthService] loginTaller ← OK', { id_taller: res.taller?.id_taller });
          localStorage.setItem('access_token', res.access_token);
          localStorage.setItem('tipo', 'taller');
          localStorage.setItem('taller_data', JSON.stringify(res.taller));
          localStorage.removeItem('user_data');
          this.currentTaller$.next(res.taller);
          this.currentUser$.next(null);
          this.isAuthenticated$.next(true);
        })
      );
  }

  loginAdmin(email: string, password: string): Observable<LoginAdminResponse> {
    return this.http
      .post<LoginAdminResponse>(`${this.baseUrl}/usuarios/login`, { email, password })
      .pipe(
        tap(res => {
          console.log('[AuthService] loginAdmin ← OK', { id_usuario: res.usuario?.id_usuario });
          localStorage.setItem('access_token', res.access_token);
          localStorage.setItem('tipo', 'usuario');
          localStorage.setItem('user_data', JSON.stringify(res.usuario));
          localStorage.removeItem('taller_data');
          this.currentUser$.next(res.usuario);
          this.currentTaller$.next(null);
          this.isAuthenticated$.next(true);
        })
      );
  }

  logout(): void {
    console.log('[AuthService] logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('tipo');
    localStorage.removeItem('user_data');
    localStorage.removeItem('taller_data');
    this.currentUser$.next(null);
    this.currentTaller$.next(null);
    this.isAuthenticated$.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getTipo(): TipoAuth | null {
    const t = localStorage.getItem('tipo');
    return t === 'taller' || t === 'usuario' ? t : null;
  }

  hasTipo(tipo: TipoAuth): boolean {
    return this.getTipo() === tipo;
  }

  getCurrentUser$(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  getCurrentUser(): User | null {
    return this.currentUser$.value;
  }

  getCurrentTaller$(): Observable<TallerAuth | null> {
    return this.currentTaller$.asObservable();
  }

  getCurrentTaller(): TallerAuth | null {
    return this.currentTaller$.value;
  }

  getIsAuthenticated$(): Observable<boolean> {
    return this.isAuthenticated$.asObservable();
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated$.value;
  }

  getUserRole(): number | null {
    return this.currentUser$.value?.id_rol ?? null;
  }

  private getStoredUser(): User | null {
    const s = localStorage.getItem('user_data');
    return s ? JSON.parse(s) : null;
  }

  private getStoredTaller(): TallerAuth | null {
    const s = localStorage.getItem('taller_data');
    return s ? JSON.parse(s) : null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = Number(payload?.exp);
      if (!Number.isFinite(exp)) return true;

      const now = Math.floor(Date.now() / 1000);
      return exp <= now;
    } catch {
      return true;
    }
  }
}
