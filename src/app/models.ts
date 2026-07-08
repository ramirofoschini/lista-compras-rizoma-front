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
  color: string | null;
  productos: Producto[];
}

// Categoría suelta (para el desplegable y el ABM del admin)
export interface CategoriaItem {
  id: number;
  nombre: string;
  orden: number | null;
  activa: boolean;
  color: string | null;
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

// Previsualización del folleto estilado (respuesta de /admin/import/folleto/preview)
export interface FolletoPreview {
  categorias: number;
  marcas: number;
  productos: number;
  presentaciones: number;
  items: {
    categoria: string;
    marca: string | null;
    nombre: string;
    presentaciones: { etiqueta: string | null; precio: number | null }[];
    notas: string | null;
  }[];
  avisos: string[];
}

export interface ImportResult {
  productosCreados: number;
  productosActualizados: number;
  presentaciones: number;
  avisos: string[];
}
