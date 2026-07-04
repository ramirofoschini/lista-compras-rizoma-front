import { computed, effect, Injectable, signal } from '@angular/core';
import { Cliente, Presentacion, Producto } from '../models';

export interface CartLine {
  productoId: number;
  nombre: string;
  marca: string | null;
  presentacionId: number;
  etiqueta: string | null;
  precio: number | null;
  cantidad: number;
}

const STORAGE_KEY = 'rizoma_carrito';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly linesSig = signal<Map<number, CartLine>>(this.restore());

  readonly cliente = signal<Cliente | null>(this.restoreCliente());
  readonly diaEntrega = signal<string | null>(localStorage.getItem('rizoma_dia') || null);

  readonly lines = computed(() => Array.from(this.linesSig().values()));
  readonly count = computed(() => this.lines().reduce((acc, l) => acc + l.cantidad, 0));
  readonly total = computed(() => this.lines().reduce((acc, l) => acc + (l.precio ?? 0) * l.cantidad, 0));

  constructor() {
    // Persistir carrito y datos ante cada cambio.
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lines()));
    });
    effect(() => {
      const c = this.cliente();
      if (c) localStorage.setItem('rizoma_cliente', JSON.stringify(c));
    });
    effect(() => {
      const d = this.diaEntrega();
      if (d) localStorage.setItem('rizoma_dia', d);
    });
  }

  cantidadDe(presentacionId: number): number {
    return this.linesSig().get(presentacionId)?.cantidad ?? 0;
  }

  setCantidad(producto: Producto, pres: Presentacion, cantidad: number): void {
    const map = new Map(this.linesSig());
    if (cantidad <= 0) {
      map.delete(pres.id);
    } else {
      map.set(pres.id, {
        productoId: producto.id,
        nombre: producto.nombre,
        marca: producto.marca,
        presentacionId: pres.id,
        etiqueta: pres.etiqueta,
        precio: pres.precio,
        cantidad,
      });
    }
    this.linesSig.set(map);
  }

  incrementar(producto: Producto, pres: Presentacion, delta: number): void {
    this.setCantidad(producto, pres, this.cantidadDe(pres.id) + delta);
  }

  /** Ajusta la cantidad de una línea ya existente (usado en el resumen). */
  setCantidadPorId(presentacionId: number, cantidad: number): void {
    const map = new Map(this.linesSig());
    const l = map.get(presentacionId);
    if (!l) return;
    if (cantidad <= 0) map.delete(presentacionId);
    else map.set(presentacionId, { ...l, cantidad });
    this.linesSig.set(map);
  }

  quitar(presentacionId: number): void {
    const map = new Map(this.linesSig());
    map.delete(presentacionId);
    this.linesSig.set(map);
  }

  vaciar(): void {
    this.linesSig.set(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }

  private restore(): Map<number, CartLine> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Map();
      const arr: CartLine[] = JSON.parse(raw);
      return new Map(arr.map((l) => [l.presentacionId, l]));
    } catch {
      return new Map();
    }
  }

  private restoreCliente(): Cliente | null {
    try {
      const raw = localStorage.getItem('rizoma_cliente');
      return raw ? (JSON.parse(raw) as Cliente) : null;
    } catch {
      return null;
    }
  }
}
