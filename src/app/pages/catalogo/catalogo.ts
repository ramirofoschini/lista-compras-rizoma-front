import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Categoria, Producto } from '../../models';

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink],
  template: `
    <div class="cab">
      <h1>Productos</h1>
      <input
        class="buscador"
        type="search"
        placeholder="Buscar producto o marca…"
        [value]="filtro()"
        (input)="filtro.set($any($event.target).value)"
      />
    </div>

    @if (loading()) {
      <div class="spinner"></div>
    } @else if (error()) {
      <div class="card">
        <p>No pudimos cargar el catálogo.</p>
        <button class="btn btn-ghost" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (filtro().trim()) {
      <!-- Búsqueda: resultados planos -->
      @for (p of resultados(); track p.id) {
        <div class="prod">
          <div class="prod-head">
            <span class="tag">{{ p.categoria }}</span>
            <span class="prod-nombre">{{ p.nombre }}</span>
            @if (p.marca) { <span class="muted"> · {{ p.marca }}</span> }
          </div>
          @if (p.notas) { <div class="prod-notas">{{ p.notas }}</div> }
          <div class="pres-list">
            @for (pres of p.presentaciones; track pres.id) {
              <div class="pres">
                <span class="pres-label">{{ pres.etiqueta || 'unidad' }}</span>
                <span class="pres-precio">{{ pres.precio != null ? money(pres.precio) : 'Consultar' }}</span>
                @if (pres.precio != null) {
                  <div class="qty">
                    <button type="button" (click)="cart.incrementar(p, pres, -1)" [disabled]="cart.cantidadDe(pres.id) === 0">−</button>
                    <span class="qty-num">{{ cart.cantidadDe(pres.id) }}</span>
                    <button type="button" (click)="cart.incrementar(p, pres, 1)">+</button>
                  </div>
                } @else { <span class="muted">por WhatsApp</span> }
              </div>
            }
          </div>
        </div>
      } @empty {
        <p class="muted">No hay productos que coincidan con “{{ filtro() }}”.</p>
      }
    } @else if (categoriaSel(); as cat) {
      <!-- Productos de la categoría elegida -->
      <button class="volver" (click)="categoriaSel.set(null)">← Categorías</button>
      <h2 class="cat-titulo">{{ cat }}</h2>
      @for (p of catActual()?.productos ?? []; track p.id) {
        <div class="prod">
          <div class="prod-head">
            <span class="prod-nombre">{{ p.nombre }}</span>
            @if (p.marca) { <span class="muted"> · {{ p.marca }}</span> }
          </div>
          @if (p.notas) { <div class="prod-notas">{{ p.notas }}</div> }
          <div class="pres-list">
            @for (pres of p.presentaciones; track pres.id) {
              <div class="pres">
                <span class="pres-label">{{ pres.etiqueta || 'unidad' }}</span>
                <span class="pres-precio">{{ pres.precio != null ? money(pres.precio) : 'Consultar' }}</span>
                @if (pres.precio != null) {
                  <div class="qty">
                    <button type="button" (click)="cart.incrementar(p, pres, -1)" [disabled]="cart.cantidadDe(pres.id) === 0">−</button>
                    <span class="qty-num">{{ cart.cantidadDe(pres.id) }}</span>
                    <button type="button" (click)="cart.incrementar(p, pres, 1)">+</button>
                  </div>
                } @else { <span class="muted">por WhatsApp</span> }
              </div>
            }
          </div>
        </div>
      }
    } @else {
      <!-- Grilla de tarjetas de categoría -->
      <div class="cat-grid">
        @for (c of categorias(); track c.nombre) {
          <button class="cat-card" (click)="categoriaSel.set(c.nombre)" [style.border-left-color]="c.color || '#4a7c59'">
            <span class="cat-nombre" [style.color]="c.color || '#3a6147'">{{ c.nombre }}</span>
            <span class="cat-count">{{ c.productos.length }} producto(s)</span>
          </button>
        } @empty {
          <p class="muted">Todavía no hay productos cargados.</p>
        }
      </div>
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
    .cab { position: sticky; top: 56px; background: var(--crema); padding-top: 0.5rem; z-index: 5; }
    .buscador { margin-bottom: 1rem; }
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.7rem; }
    .cat-card {
      display: flex; flex-direction: column; gap: 0.3rem; text-align: left;
      background: #fff; border: 1px solid var(--linea); border-left: 4px solid var(--verde);
      border-radius: var(--radio); padding: 0.9rem; cursor: pointer; box-shadow: var(--sombra);
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .cat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .cat-nombre { font-weight: 600; color: var(--verde-osc); line-height: 1.2; }
    .cat-count { font-size: 0.75rem; color: var(--gris); }
    .volver { background: none; border: none; color: var(--verde-osc); font-weight: 600; cursor: pointer; padding: 0.3rem 0; font-size: 0.95rem; }
    .cat-titulo { color: var(--verde-osc); border-bottom: 2px solid var(--verde-claro); padding-bottom: 0.3rem; margin-bottom: 0.7rem; }
    .prod { background: #fff; border: 1px solid var(--linea); border-radius: var(--radio); padding: 0.75rem 0.9rem; margin-bottom: 0.6rem; box-shadow: var(--sombra); }
    .prod-head { font-size: 0.98rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
    .prod-nombre { font-weight: 600; }
    .prod-notas { margin-top: 0.3rem; font-size: 0.8rem; color: var(--gris); }
    .pres-list { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .pres { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 0.5rem; padding-top: 0.4rem; border-top: 1px dashed var(--linea); }
    .pres:first-child { border-top: none; padding-top: 0; }
    .pres-label { color: var(--gris); font-size: 0.9rem; }
    .pres-precio { font-weight: 700; white-space: nowrap; }
    .qty { display: flex; align-items: center; gap: 0.5rem; }
    .qty button { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--verde); background: #fff; color: var(--verde-osc); font-size: 1.25rem; line-height: 1; cursor: pointer; }
    .qty button:disabled { opacity: 0.35; cursor: not-allowed; }
    .qty-num { min-width: 1.4rem; text-align: center; font-weight: 600; }
    .bottombar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 1rem; max-width: 760px; margin: 0 auto; padding: 0.7rem 1rem; background: #fff; border-top: 1px solid var(--linea); box-shadow: 0 -2px 10px rgba(0,0,0,0.08); }
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
  categoriaSel = signal<string | null>(null);

  catActual = computed(() => this.categorias().find((c) => c.nombre === this.categoriaSel()));

  resultados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    if (!q) return [];
    const todos: Producto[] = this.categorias().flatMap((c) => c.productos);
    return todos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.marca?.toLowerCase().includes(q) ?? false) ||
        p.categoria.toLowerCase().includes(q),
    );
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
