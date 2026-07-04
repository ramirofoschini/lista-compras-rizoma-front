# Rizoma — Frontend de pedidos

App web (Angular 20) para que los clientes de **Rizoma** armen su pedido y lo envíen por WhatsApp.

## Flujo del cliente
1. **Datos** — nombre, apellido, dirección, celular y día de entrega.
2. **Productos** — catálogo por categoría, buscador y selector de cantidad por presentación.
3. **Pedido** — resumen editable → **Confirmar** → genera **PDF descargable** + botón **Enviar por WhatsApp** (link `wa.me` con el pedido ya escrito).

También incluye un **panel admin** (`/admin`): login, carga masiva por Excel y edición de productos.

## Stack
- Angular 20 (standalone + signals)
- `jspdf` + `jspdf-autotable` (comprobante PDF, se genera en el navegador)

## Configuración
La URL del backend se define en [`src/environments/environment.ts`](src/environments/environment.ts):
```ts
export const environment = { apiBase: 'http://localhost:8080/api' };
```
En producción cambiala por la URL pública del backend en Render.

## Correr en local
```bash
npm install
npm start          # http://localhost:4200  (requiere el backend corriendo)
```

## Build de producción
```bash
npm run build      # genera dist/rizoma-pedidos-frontend
```

## Deploy en Render (Static Site)
- Build command: `npm ci && npm run build`
- Publish directory: `dist/rizoma-pedidos-frontend/browser`
- Setear `apiBase` a la URL del backend antes de buildear.
- Recordá agregar la URL del frontend a `CORS_ORIGINS` del backend.
