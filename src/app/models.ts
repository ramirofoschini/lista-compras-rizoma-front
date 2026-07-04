// Modelos que reflejan los DTOs del backend.

export interface Presentacion {
  id: number;
  etiqueta: string | null;
  precio: number | null;
  disponible: boolean;
}

export interface Producto {
  id: number;
  categoriaId: number;
  categoria: string;
  marca: string | null;
  nombre: string;
  notas: string | null;
  presentaciones: Presentacion[];
}

// Catálogo agrupado (respuesta de /api/catalogo)
export interface Categoria {
  nombre: string;
  productos: Producto[];
}

// Categoría suelta (para el desplegable y el ABM del admin)
export interface CategoriaItem {
  id: number;
  nombre: string;
  orden: number | null;
  activa: boolean;
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
