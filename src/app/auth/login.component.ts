import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import { TenantService } from '../shared/services/tenant.service';

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
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  // Portal según el host:
  //   - apex (midominio.space)              -> 'admin'  (super-admin global)
  //   - subdominio (taller.midominio.space) -> 'tenant' (login del taller)
  portal = signal<'admin' | 'tenant'>('admin');
  tenantSlug = signal<string | null>(null);
  tenantNombre = signal<string | null>(null);
  tenantNoEncontrado = signal(false);

  private allRoles: RolOption[] = [
    { tipo: 'taller', name: 'Taller (Gerente)', email: 'tallerexcelente.demo@gmail.com', password: 'taller123!' },
    { tipo: 'admin', name: 'Admin', email: 'admin.flujoemergencia@gmail.com', password: 'admin123!' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private tenantService: TenantService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    const slug = TenantService.detectSlug();
    if (slug) {
      // Estamos en el subdominio de un taller -> portal del taller
      this.portal.set('tenant');
      this.tenantSlug.set(slug);
      this.tenantService.getBySlug(slug).subscribe({
        next: (t) => this.tenantNombre.set(t.nombre),
        error: () => this.tenantNoEncontrado.set(true)
      });
    } else {
      // Apex / www -> portal de administrador
      this.portal.set('admin');
    }
  }

  /** Cuentas de prueba filtradas según el portal (taller o admin). */
  get roles(): RolOption[] {
    const tipo: TipoRol = this.portal() === 'tenant' ? 'taller' : 'admin';
    return this.allRoles.filter(r => r.tipo === tipo);
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

    const parseError = (err: any): string => {
      const detail = err?.error?.detail;
      if (!detail) return 'Error en el login. Intenta nuevamente.';
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) return detail.map((e: any) => e.msg ?? e).join(', ');
      return 'Datos inválidos. Verifica email y contraseña.';
    };

    if (this.portal() === 'tenant') {
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
    this.loginForm.patchValue({
      email: role.email,
      password: role.password
    });
  }

  clearError(): void {
    this.error.set(null);
  }
}
