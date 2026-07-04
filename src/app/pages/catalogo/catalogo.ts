import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Categoria } from '../../models';

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink],
  template: `
    <h1>Productos</h1>

    <input
      class="buscador"
      type="search"
      placeholder="Buscar producto o marca…"
      [value]="filtro()"
      (input)="filtro.set($any($event.target).value)"
    />

    @if (loading()) {
      <div class="spinner"></div>
    } @else if (error()) {
      <div class="card">
        <p>No pudimos cargar el catálogo.</p>
        <button class="btn btn-ghost" (click)="cargar()">Reintentar</button>
      </div>
    } @else {
      @for (cat of filtradas(); track cat.nombre) {
        <section class="cat-block">
          <h2 class="cat-titulo">{{ cat.nombre }}</h2>
          @for (p of cat.productos; track p.id) {
            <div class="prod">
              <div class="prod-head">
                <span class="prod-nombre">{{ p.nombre }}</span>
                @if (p.marca) { <span class="muted"> · {{ p.marca }}</span> }
              </div>
              @if (p.notas) { <div class="prod-notas tag">{{ p.notas }}</div> }
              <div class="pres-list">
                @for (pres of p.presentaciones; track pres.id) {
                  <div class="pres">
                    <span class="pres-label">{{ pres.etiqueta || 'unidad' }}</span>
                    <span class="pres-precio">{{ pres.precio != null ? money(pres.precio) : 'Consultar' }}</span>
                    @if (pres.precio != null) {
                      <div class="qty">
                        <button type="button" (click)="cart.incrementar(p, pres, -1)"
                                [disabled]="cart.cantidadDe(pres.id) === 0" aria-label="Quitar">−</button>
                        <span class="qty-num">{{ cart.cantidadDe(pres.id) }}</span>
                        <button type="button" (click)="cart.incrementar(p, pres, 1)" aria-label="Agregar">+</button>
                      </div>
                    } @else {
                      <span class="muted">por WhatsApp</span>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </section>
      } @empty {
        <p class="muted">No hay productos que coincidan con “{{ filtro() }}”.</p>
      }
    }

    @if (cart.count() > 0) {
      <div class="bottombar">
        <div class="bb-total">
          <small>{{ cart.count() }} ítem(s)</small>
          <strong>{{ money(cart.total()) }}</strong>
        </div>
        <a routerLink="/resumen" class="btn btn-primary">Ver pedido →</a>
      </div>
    }
  `,
  styles: [`
    .buscador { margin-bottom: 1rem; }
    .cat-block { margin-bottom: 1.5rem; }
    .cat-titulo {
      position: sticky; top: 56px; background: var(--crema);
      padding: 0.4rem 0; margin: 0 0 0.5rem; color: var(--verde-osc);
      border-bottom: 2px solid var(--verde-claro); z-index: 5;
    }
    .prod {
      background: #fff; border: 1px solid var(--linea); border-radius: var(--radio);
      padding: 0.75rem 0.9rem; margin-bottom: 0.6rem; box-shadow: var(--sombra);
    }
    .prod-head { font-size: 0.98rem; }
    .prod-nombre { font-weight: 600; }
    .prod-notas { margin-top: 0.3rem; }
    .pres-list { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .pres {
      display: grid; grid-template-columns: 1fr auto auto; align-items: center;
      gap: 0.5rem; padding-top: 0.4rem; border-top: 1px dashed var(--linea);
    }
    .pres:first-child { border-top: none; padding-top: 0; }
    .pres-label { color: var(--gris); font-size: 0.9rem; }
    .pres-precio { font-weight: 700; color: var(--texto); white-space: nowrap; }
    .qty { display: flex; align-items: center; gap: 0.5rem; }
    .qty button {
      width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--verde);
      background: #fff; color: var(--verde-osc); font-size: 1.25rem; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .qty button:disabled { opacity: 0.35; cursor: not-allowed; }
    .qty-num { min-width: 1.4rem; text-align: center; font-weight: 600; }
    .bottombar {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      max-width: 760px; margin: 0 auto; padding: 0.7rem 1rem;
      background: #fff; border-top: 1px solid var(--linea);
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
    }
    .bb-total { display: flex; flex-direction: column; line-height: 1.1; }
    .bb-total small { color: var(--gris); font-size: 0.72rem; }
    .bb-total strong { font-size: 1.15rem; }
  `],
})
export class Catalogo implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  cart = inject(CartService);

  categorias = signal<Categoria[]>([]);
  loading = signal(true);
  error = signal(false);
  filtro = signal('');

  filtradas = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    if (!q) return this.categorias();
    return this.categorias()
      .map((c) => ({
        nombre: c.nombre,
        productos: c.productos.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.marca?.toLowerCase().includes(q) ?? false) ||
            c.nombre.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.productos.length > 0);
  });

  ngOnInit(): void {
    if (!this.cart.cliente()) {
      this.router.navigate(['/']);
      return;
    }
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getCatalogo().subscribe({
      next: (cats) => {
        this.categorias.set(cats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  money(n: number): string {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }
}
