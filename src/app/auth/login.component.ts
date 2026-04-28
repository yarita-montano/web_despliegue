import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginTallerResponse, LoginAdminResponse } from '../shared/services/auth.service';

type TipoRol = 'taller' | 'admin';

interface RolOption {
  tipo: TipoRol;
  name: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  tipoSeleccionado = signal<TipoRol>('taller');

  roles: RolOption[] = [
    { tipo: 'taller', name: 'Taller (Gerente)', email: 'gerente@tallerexcelente.com', password: 'taller123!' },
    { tipo: 'admin', name: 'Admin', email: 'admin@plataforma.com', password: 'admin123!' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.error.set('Por favor completa los campos correctamente');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const email = (this.loginForm.value.email as string).trim();
    const password = this.loginForm.value.password as string;
    const tipo = this.tipoSeleccionado();

    const parseError = (err: any): string => {
      const detail = err?.error?.detail;
      if (!detail) return 'Error en el login. Intenta nuevamente.';
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) return detail.map((e: any) => e.msg ?? e).join(', ');
      return 'Datos inválidos. Verifica email y contraseña.';
    };

    if (tipo === 'taller') {
      this.authService.loginTaller(email, password).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard/taller']);
        },
        error: (err: any) => {
          this.loading.set(false);
          this.error.set(parseError(err));
        }
      });
    } else {
      this.authService.loginAdmin(email, password).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard/admin']);
        },
        error: (err: any) => {
          this.loading.set(false);
          this.error.set(parseError(err));
        }
      });
    }
  }

  setCredentials(role: RolOption): void {
    this.tipoSeleccionado.set(role.tipo);
    this.loginForm.patchValue({
      email: role.email,
      password: role.password
    });
  }

  clearError(): void {
    this.error.set(null);
  }
}
