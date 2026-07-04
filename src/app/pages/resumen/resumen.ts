import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { PdfService } from '../../services/pdf.service';
import { CrearPedidoRequest, PedidoResponse } from '../../models';

@Component({
  selector: 'app-resumen',
  imports: [RouterLink],
  template: `
    @if (pedido(); as ped) {
      <div class="card exito">
        <div class="check">✓</div>
        <h1>¡Pedido #{{ ped.id }} confirmado!</h1>
        <p class="muted">Enviáselo a Rizoma por WhatsApp para que lo preparen. Total: <strong>{{ money(ped.total) }}</strong>.</p>
        <a class="btn btn-wa btn-block" [href]="waUrl()" target="_blank" rel="noopener">📲 Enviar a Rizoma por WhatsApp</a>
        <button class="btn btn-ghost btn-block" (click)="descargarPdf()">Descargar comprobante (PDF)</button>
        <button class="btn btn-ghost btn-block" (click)="otroPedido()">Hacer otro pedido</button>
      </div>
    } @else if (cart.lines().length === 0) {
      <h1>Tu pedido</h1>
      <div class="card">
        <p>Todavía no agregaste productos.</p>
        <a routerLink="/catalogo" class="btn btn-primary">Ver productos</a>
      </div>
    } @else {
      <h1>Tu pedido</h1>

      <div class="card datos-cliente">
        <div>
          <strong>{{ cart.cliente()?.nombre }} {{ cart.cliente()?.apellido }}</strong>
          <div class="muted">{{ cart.cliente()?.direccion }}</div>
          <div class="muted">{{ cart.cliente()?.celular }}@if (cart.diaEntrega()) { · Entrega: {{ cart.diaEntrega() }} }</div>
        </div>
        <a routerLink="/" class="btn btn-ghost">Editar</a>
      </div>

      <div class="lineas">
        @for (l of cart.lines(); track l.presentacionId) {
          <div class="linea">
            <div class="l-info">
              <span class="l-nombre">{{ l.nombre }}</span>
              <span class="muted">{{ l.etiqueta || 'unidad' }} · {{ money(l.precio ?? 0) }}</span>
            </div>
            <div class="qty">
              <button type="button" (click)="dec(l.presentacionId)" aria-label="Menos">−</button>
              <span class="qty-num">{{ l.cantidad }}</span>
              <button type="button" (click)="inc(l.presentacionId)" aria-label="Más">+</button>
            </div>
            <span class="l-sub">{{ money((l.precio ?? 0) * l.cantidad) }}</span>
            <button type="button" class="l-quitar" (click)="cart.quitar(l.presentacionId)" aria-label="Quitar">🗑</button>
          </div>
        }
      </div>

      <div class="total-row">
        <span>Total</span>
        <strong>{{ money(cart.total()) }}</strong>
      </div>

      @if (errorMsg()) { <div class="card err">{{ errorMsg() }}</div> }

      <button class="btn btn-primary btn-block" (click)="confirmar()" [disabled]="enviando()">
        {{ enviando() ? 'Confirmando…' : 'Confirmar pedido' }}
      </button>
      <a routerLink="/catalogo" class="btn btn-ghost btn-block">← Seguir agregando</a>
    }
  `,
  styles: [`
    .datos-cliente { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .lineas { display: flex; flex-direction: column; gap: 0.5rem; }
    .linea {
      display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 0.6rem;
      background: #fff; border: 1px solid var(--linea); border-radius: var(--radio); padding: 0.6rem 0.75rem;
    }
    .l-info { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
    .l-nombre { font-weight: 600; }
    .l-sub { font-weight: 700; white-space: nowrap; }
    .l-quitar { background: none; border: none; cursor: pointer; font-size: 1.05rem; }
    .qty { display: flex; align-items: center; gap: 0.4rem; }
    .qty button {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--verde);
      background: #fff; color: var(--verde-osc); font-size: 1.15rem; cursor: pointer;
    }
    .qty-num { min-width: 1.3rem; text-align: center; font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 1.2rem; margin: 1rem 0; }
    .err { border-color: #e0b4b4; background: #fdf3f3; color: #a94442; margin-bottom: 0.8rem; }
    .exito { text-align: center; display: flex; flex-direction: column; gap: 0.7rem; align-items: center; }
    .exito .check {
      width: 64px; height: 64px; border-radius: 50%; background: var(--verde); color: #fff;
      font-size: 2rem; display: flex; align-items: center; justify-content: center; margin-bottom: 0.3rem;
    }
    .exito .btn-block { max-width: 360px; }
  `],
})
export class Resumen implements OnInit {
  cart = inject(CartService);
  private api = inject(ApiService);
  private pdf = inject(PdfService);
  private router = inject(Router);

  pedido = signal<PedidoResponse | null>(null);
  enviando = signal(false);
  errorMsg = signal<string | null>(null);
  private whatsappDestino = signal('');

  ngOnInit(): void {
    if (!this.cart.cliente()) {
      this.router.navigate(['/']);
      return;
    }
    this.api.getConfig().subscribe({
      next: (cfg) => this.whatsappDestino.set(cfg.whatsappDestino),
      error: () => {},
    });
  }

  inc(id: number): void {
    const l = this.cart.lines().find((x) => x.presentacionId === id);
    if (l) this.cart.setCantidadPorId(id, l.cantidad + 1);
  }

  dec(id: number): void {
    const l = this.cart.lines().find((x) => x.presentacionId === id);
    if (l) this.cart.setCantidadPorId(id, l.cantidad - 1);
  }

  confirmar(): void {
    const cliente = this.cart.cliente();
    if (!cliente || this.cart.lines().length === 0) return;
    this.enviando.set(true);
    this.errorMsg.set(null);
    const req: CrearPedidoRequest = {
      cliente,
      diaEntrega: this.cart.diaEntrega(),
      items: this.cart.lines().map((l) => ({ presentacionId: l.presentacionId, cantidad: l.cantidad })),
    };
    this.api.crearPedido(req).subscribe({
      next: (p) => {
        this.pedido.set(p);
        this.enviando.set(false);
        this.cart.vaciar();
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorMsg.set(e?.error?.message || 'No se pudo confirmar el pedido. Intentá de nuevo.');
      },
    });
  }

  waUrl(): string {
    const p = this.pedido();
    if (!p) return '#';
    return this.pdf.urlWhatsapp(this.whatsappDestino(), this.pdf.textoWhatsapp(p));
  }

  descargarPdf(): void {
    const p = this.pedido();
    if (p) this.pdf.descargarPedidoPdf(p);
  }

  otroPedido(): void {
    this.pedido.set(null);
    this.router.navigate(['/catalogo']);
  }

  money(n: number): string {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }
}
