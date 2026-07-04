import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-datos',
  imports: [ReactiveFormsModule],
  template: `
    <h1>Tus datos</h1>
    <p class="muted">Completá tus datos para armar el pedido. Entregas: {{ dias().join(' y ') }} de {{ horario() }}.</p>

    <form class="card" [formGroup]="form" (ngSubmit)="continuar()">
      <div class="field">
        <label for="nombre">Nombre</label>
        <input id="nombre" formControlName="nombre" autocomplete="given-name" />
        @if (invalido('nombre')) { <div class="error">Ingresá tu nombre.</div> }
      </div>

      <div class="field">
        <label for="apellido">Apellido</label>
        <input id="apellido" formControlName="apellido" autocomplete="family-name" />
        @if (invalido('apellido')) { <div class="error">Ingresá tu apellido.</div> }
      </div>

      <div class="field">
        <label for="direccion">Dirección de entrega</label>
        <input id="direccion" formControlName="direccion" placeholder="Calle, número, piso, entre calles…" />
        @if (invalido('direccion')) { <div class="error">Ingresá la dirección completa.</div> }
      </div>

      <div class="field">
        <label for="celular">Celular</label>
        <input id="celular" formControlName="celular" inputmode="tel" placeholder="221 555 5555" />
        @if (invalido('celular')) { <div class="error">Ingresá un celular válido.</div> }
      </div>

      <div class="field">
        <label for="dia">Día de entrega preferido</label>
        <select id="dia" formControlName="diaEntrega">
          <option value="">Sin preferencia</option>
          @for (d of dias(); track d) { <option [value]="d">{{ d }}</option> }
        </select>
      </div>

      <button type="submit" class="btn btn-primary btn-block">Ver productos →</button>
    </form>
  `,
})
export class Datos implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cart = inject(CartService);
  private api = inject(ApiService);

  dias = signal<string[]>(['MARTES', 'JUEVES']);
  horario = signal('18 a 21 hs');

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    direccion: ['', Validators.required],
    celular: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{6,25}$/)]],
    diaEntrega: [''],
  });

  ngOnInit(): void {
    const c = this.cart.cliente();
    if (c) this.form.patchValue({ ...c, diaEntrega: this.cart.diaEntrega() ?? '' });
    this.api.getConfig().subscribe({
      next: (cfg) => {
        this.dias.set(cfg.diasEntrega);
        this.horario.set(cfg.horarioEntrega);
      },
      error: () => {},
    });
  }

  invalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  continuar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.cart.cliente.set({
      nombre: v.nombre,
      apellido: v.apellido,
      direccion: v.direccion,
      celular: v.celular,
    });
    this.cart.diaEntrega.set(v.diaEntrega || null);
    this.router.navigate(['/catalogo']);
  }
}
