// Modelos que reflejan los DTOs del backend.

export interface Presentacion {
  id: number;
  etiqueta: string | null;
  precio: number | null;
  disponible: boolean;
}

export interface Producto {
  id: number;
  categoria: string;
  marca: string | null;
  nombre: string;
  notas: string | null;
  presentaciones: Presentacion[];
}

export interface Categoria {
  nombre: string;
  productos: Producto[];
}

export interface Cliente {
  nombre: string;
  apellido: string;
  direccion: string;
  celular: string;
}

export interface ItemPedido {
  presentacionId: number;
  cantidad: number;
}

export interface CrearPedidoRequest {
  cliente: Cliente;
  diaEntrega: string | null;
  items: ItemPedido[];
}

export interface PedidoItemResponse {
  nombreProducto: string;
  etiqueta: string | null;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface PedidoResponse {
  id: number;
  estado: string;
  diaEntrega: string | null;
  total: number;
  cliente: Cliente;
  items: PedidoItemResponse[];
  creadoEn: string;
}

export interface AppConfig {
  whatsappDestino: string;
  diasEntrega: string[];
  horarioEntrega: string;
}
