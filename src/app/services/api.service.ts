import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppConfig, Categoria, CrearPedidoRequest, PedidoResponse, Producto } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  // ---- Público ----
  getCatalogo(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.base}/catalogo`);
  }

  getConfig(): Observable<AppConfig> {
    return this.http.get<AppConfig>(`${this.base}/config`);
  }

  crearPedido(req: CrearPedidoRequest): Observable<PedidoResponse> {
    return this.http.post<PedidoResponse>(`${this.base}/pedidos`, req);
  }

  // ---- Admin (Basic Auth) ----
  private authHeaders(user: string, pass: string): HttpHeaders {
    return new HttpHeaders({ Authorization: 'Basic ' + btoa(`${user}:${pass}`) });
  }

  adminListarProductos(user: string, pass: string): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.base}/admin/productos`, { headers: this.authHeaders(user, pass) });
  }

  adminGuardarProducto(p: unknown, user: string, pass: string, id?: number): Observable<Producto> {
    const headers = this.authHeaders(user, pass);
    return id
      ? this.http.put<Producto>(`${this.base}/admin/productos/${id}`, p, { headers })
      : this.http.post<Producto>(`${this.base}/admin/productos`, p, { headers });
  }

  adminDesactivarProducto(id: number, user: string, pass: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/productos/${id}`, { headers: this.authHeaders(user, pass) });
  }

  adminImportar(file: File, user: string, pass: string): Observable<unknown> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.base}/admin/import`, form, { headers: this.authHeaders(user, pass) });
  }
}
