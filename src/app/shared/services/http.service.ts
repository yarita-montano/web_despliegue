import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Obtiene los headers con el token de autenticación
   */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Solo agregar Authorization si el token existe (Bug 1 fix)
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Maneja errores HTTP, especialmente 401 (Bug 2 fix)
   */
  private handleError(error: any) {
    if (error.status === 401) {
      // Token expirado o inválido
      this.authService.logout();
      this.router.navigate(['/login']);
      return throwError(() => new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'));
    }

    // Propagar otros errores
    return throwError(() => error);
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(
      `${this.baseUrl}${endpoint}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(
      `${this.baseUrl}${endpoint}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }
}
