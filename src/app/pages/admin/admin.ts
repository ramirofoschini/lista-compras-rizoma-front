import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CategoriaItem, Producto } from '../../models';

interface DraftPres { id?: number; etiqueta: string; precio: number | null; activo: boolean; }
interface Draft { id?: number; categoriaId: number | null; marca: string; nombre: string; notas: string; activo: boolean; presentaciones: DraftPres[]; }

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  template: `
    @if (!autenticado()) {
      <h1>Panel Rizoma</h1>
      <form class="card" (ngSubmit)="login()">
        <div class="field">
          <label>Usuario</label>
          <input [ngModel]="user()" (ngModelChange)="user.set($event)" name="user" autocomplete="username" />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input type="password" [ngModel]="pass()" (ngModelChange)="pass.set($event)" name="pass" autocomplete="current-password" />
        </div>
        @if (loginError()) { <div class="error">Usuario o contraseña incorrectos.</div> }
        <button class="btn btn-primary btn-block" [disabled]="cargando()">{{ cargando() ? 'Entrando…' : 'Entrar' }}</button>
      </form>
    } @else {
      <div class="head">
        <h1>Panel Rizoma</h1>
        <button class="btn btn-ghost" (click)="salir()">Salir</button>
      </div>

      <!-- Carga masiva -->
      <section class="card">
        <h2>Carga masiva (Excel normalizado)</h2>
        <p class="muted">Columnas: categoria, marca, producto, presentacion, precio, notas.</p>
        <input type="file" accept=".xlsx,.xls" (change)="onFile($event)" />
        <button class="btn btn-primary" [disabled]="!archivo() || importando()" (click)="importar()">
          {{ importando() ? 'Importando…' : 'Importar' }}
        </button>
        @if (importResult(); as r) {
          <div class="import-ok">
            ✓ {{ r.productosCreados }} creados, {{ r.productosActualizados }} actualizados, {{ r.presentaciones }} presentaciones.
            @if (r.avisos?.length) { <ul>@for (a of r.avisos; track a) { <li>{{ a }}</li> }</ul> }
          </div>
        }
        @if (importError()) { <div class="error">{{ importError() }}</div> }
      </section>

      <!-- ABM de categorías -->
      <section class="card">
        <h2>Categorías</h2>
        <div class="cat-nueva">
          <input placeholder="Nueva categoría" [ngModel]="nuevaCat()" (ngModelChange)="nuevaCat.set($event)" name="nuevaCat" />
          <button class="btn btn-primary" (click)="crearCategoria()">+ Crear</button>
        </div>
        <div class="cat-head"><span>Nombre</span><span>Orden</span><span>Activa</span><span></span></div>
        @for (c of categorias(); track c.id) {
          <div class="cat-row">
            <input [(ngModel)]="c.nombre" [name]="'cn' + c.id" />
            <input type="number" [(ngModel)]="c.orden" [name]="'co' + c.id" />
            <label class="chk"><input type="checkbox" [(ngModel)]="c.activa" [name]="'ca' + c.id" /></label>
            <button class="btn btn-ghost" (click)="guardarCategoria(c)">Guardar</button>
          </div>
        }
      </section>

      <!-- Productos -->
      <div class="toolbar">
        <input type="search" placeholder="Buscar producto…" [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" name="filtro" />
        <span class="muted">{{ filtradas().length }} productos</span>
      </div>

      @if (cargando()) { <div class="spinner"></div> }

      @for (p of filtradas(); track p.id) {
        <div class="prod-row">
          <div class="pr-info">
            <strong>{{ p.nombre }}</strong>
            <span class="muted">{{ p.categoria }}@if (p.marca) { · {{ p.marca }} }</span>
            <span class="muted">{{ p.presentaciones.length }} present.</span>
          </div>
          <button class="btn btn-ghost" (click)="editar(p)">Editar</button>
        </div>

        @if (editando()?.id === p.id) {
          <div class="editor card">
            <div class="grid2">
              <div class="field"><label>Nombre</label><input [(ngModel)]="draft.nombre" name="d_nombre" /></div>
              <div class="field">
                <label>Categoría</label>
                <select [(ngModel)]="draft.categoriaId" name="d_cat">
                  <option [ngValue]="null" disabled>— elegí categoría —</option>
                  @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
                </select>
              </div>
              <div class="field"><label>Marca</label><input [(ngModel)]="draft.marca" name="d_marca" /></div>
              <div class="field"><label>Notas</label><input [(ngModel)]="draft.notas" name="d_notas" /></div>
            </div>
            <label class="chk"><input type="checkbox" [(ngModel)]="draft.activo" name="d_activo" /> Producto activo (visible para clientes)</label>

            <h3>Presentaciones</h3>
            @if (draft.presentaciones.length) {
              <div class="pres-head"><span>Presentación</span><span>Precio</span><span>Activa</span><span></span></div>
            }
            @for (pr of draft.presentaciones; track $index) {
              <div class="pres-edit">
                <input placeholder="Ej. 1/2 kg" [(ngModel)]="pr.etiqueta" [name]="'et' + $index" />
                <input type="number" placeholder="Precio" [(ngModel)]="pr.precio" [name]="'pc' + $index" />
                <label class="chk"><input type="checkbox" [(ngModel)]="pr.activo" [name]="'ac' + $index" /></label>
                <button type="button" class="btn btn-ghost" (click)="quitarPres($index)">✕</button>
              </div>
            }
            <button type="button" class="btn btn-ghost" (click)="agregarPres()">+ Agregar presentación</button>

            <div class="editor-actions">
              <button class="btn btn-primary" [disabled]="guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
              <button class="btn btn-ghost" (click)="cancelar()">Cancelar</button>
              @if (draft.id) { <button class="btn btn-ghost danger" (click)="desactivar(p)">Desactivar</button> }
            </div>
          </div>
        }
      }
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; }
    .card { margin-bottom: 1rem; }
    .card h2 { margin-top: 0; }
    input[type="file"] { margin-bottom: 0.6rem; }
    .import-ok { margin-top: 0.6rem; color: var(--verde-osc); background: var(--verde-claro); padding: 0.6rem; border-radius: 8px; font-size: 0.9rem; }
    .error { color: #c0392b; margin-top: 0.5rem; font-size: 0.85rem; }
    .cat-nueva { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
    .cat-nueva input { flex: 1; }
    .cat-head, .cat-row { display: grid; grid-template-columns: 1fr 80px 60px auto; gap: 0.5rem; align-items: center; }
    .cat-head { font-size: 0.75rem; color: var(--gris); font-weight: 600; margin-bottom: 0.3rem; }
    .cat-row { margin-bottom: 0.4rem; }
    .toolbar { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.6rem; }
    .toolbar input { flex: 1; }
    .prod-row { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; background: #fff; border: 1px solid var(--linea); border-radius: 10px; padding: 0.55rem 0.75rem; margin-bottom: 0.35rem; }
    .pr-info { display: flex; flex-direction: column; line-height: 1.2; }
    .pr-info .muted { font-size: 0.78rem; }
    .editor { margin: 0 0 0.8rem; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .chk { display: flex; align-items: center; gap: 0.4rem; font-weight: 400; margin: 0.5rem 0; }
    .chk input { width: auto; }
    .pres-head { display: grid; grid-template-columns: 1fr 110px auto auto; gap: 0.5rem; font-size: 0.75rem; color: var(--gris); font-weight: 600; margin-bottom: 0.3rem; }
    .pres-edit { display: grid; grid-template-columns: 1fr 110px auto auto; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; }
    .editor-actions { display: flex; gap: 0.5rem; margin-top: 0.8rem; flex-wrap: wrap; }
    .danger { color: #c0392b; border-color: #e0b4b4; }
    @media (max-width: 560px) { .grid2, .pres-edit { grid-template-columns: 1fr; } }
  `],
})
export class Admin implements OnInit {
  private api = inject(ApiService);

  user = signal('');
  pass = signal('');
  autenticado = signal(false);
  loginError = signal(false);
  cargando = signal(false);

  productos = signal<Producto[]>([]);
  categorias = signal<CategoriaItem[]>([]);
  nuevaCat = signal('');
  filtro = signal('');

  archivo = signal<File | null>(null);
  importando = signal(false);
  importResult = signal<{ productosCreados: number; productosActualizados: number; presentaciones: number; avisos: string[] } | null>(null);
  importError = signal<string | null>(null);

  editando = signal<Producto | null>(null);
  draft: Draft = this.draftVacio();
  guardando = signal(false);

  filtradas = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const list = this.productos();
    if (!q) return list;
    return list.filter((p) => p.nombre.toLowerCase().includes(q) || (p.marca?.toLowerCase().includes(q) ?? false) || p.categoria.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    const raw = sessionStorage.getItem('rizoma_admin');
    if (raw) {
      const { user, pass } = JSON.parse(raw);
      this.user.set(user);
      this.pass.set(pass);
      this.login();
    }
  }

  login(): void {
    this.cargando.set(true);
    this.loginError.set(false);
    this.api.adminListarProductos(this.user(), this.pass()).subscribe({
      next: (list) => {
        this.productos.set(list);
        this.autenticado.set(true);
        this.cargando.set(false);
        sessionStorage.setItem('rizoma_admin', JSON.stringify({ user: this.user(), pass: this.pass() }));
        this.cargarCategorias();
      },
      error: () => {
        this.loginError.set(true);
        this.cargando.set(false);
        sessionStorage.removeItem('rizoma_admin');
      },
    });
  }

  salir(): void {
    sessionStorage.removeItem('rizoma_admin');
    this.autenticado.set(false);
    this.pass.set('');
  }

  cargar(): void {
    this.api.adminListarProductos(this.user(), this.pass()).subscribe({ next: (list) => this.productos.set(list) });
  }

  cargarCategorias(): void {
    this.api.adminListarCategorias(this.user(), this.pass()).subscribe({ next: (cs) => this.categorias.set(cs) });
  }

  crearCategoria(): void {
    const nombre = this.nuevaCat().trim();
    if (!nombre) return;
    this.api.adminGuardarCategoria({ nombre, activa: true }, this.user(), this.pass()).subscribe({
      next: () => { this.nuevaCat.set(''); this.cargarCategorias(); },
      error: (e) => alert(e?.error?.message || 'No se pudo crear la categoría.'),
    });
  }

  guardarCategoria(c: CategoriaItem): void {
    this.api.adminGuardarCategoria({ nombre: c.nombre, orden: c.orden, activa: c.activa }, this.user(), this.pass(), c.id).subscribe({
      next: () => this.cargarCategorias(),
      error: (e) => alert(e?.error?.message || 'No se pudo guardar la categoría.'),
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  importar(): void {
    const f = this.archivo();
    if (!f) return;
    this.importando.set(true);
    this.importError.set(null);
    this.importResult.set(null);
    this.api.adminImportar(f, this.user(), this.pass()).subscribe({
      next: (r: any) => { this.importResult.set(r); this.importando.set(false); this.cargar(); this.cargarCategorias(); },
      error: (e) => { this.importError.set(e?.error?.message || 'No se pudo importar el archivo.'); this.importando.set(false); },
    });
  }

  editar(p: Producto): void {
    this.editando.set(p);
    this.draft = {
      id: p.id,
      categoriaId: p.categoriaId,
      marca: p.marca ?? '',
      nombre: p.nombre,
      notas: p.notas ?? '',
      activo: true,
      presentaciones: p.presentaciones.map((pr) => ({ id: pr.id, etiqueta: pr.etiqueta ?? '', precio: pr.precio, activo: pr.disponible })),
    };
  }

  agregarPres(): void {
    this.draft.presentaciones.push({ etiqueta: '', precio: null, activo: true });
  }

  quitarPres(i: number): void {
    this.draft.presentaciones.splice(i, 1);
  }

  guardar(): void {
    if (!this.draft.categoriaId) { alert('Elegí una categoría.'); return; }
    this.guardando.set(true);
    const input = {
      categoriaId: this.draft.categoriaId,
      marca: this.draft.marca || null,
      nombre: this.draft.nombre,
      notas: this.draft.notas || null,
      activo: this.draft.activo,
      presentaciones: this.draft.presentaciones.map((pr) => ({ id: pr.id, etiqueta: pr.etiqueta || null, precio: pr.precio, activo: pr.activo })),
    };
    this.api.adminGuardarProducto(input, this.user(), this.pass(), this.draft.id).subscribe({
      next: () => { this.guardando.set(false); this.editando.set(null); this.cargar(); },
      error: (e) => { this.guardando.set(false); alert(e?.error?.message || 'No se pudo guardar.'); },
    });
  }

  cancelar(): void {
    this.editando.set(null);
  }

  desactivar(p: Producto): void {
    if (!confirm(`¿Desactivar "${p.nombre}"? No se mostrará a los clientes.`)) return;
    this.api.adminDesactivarProducto(p.id, this.user(), this.pass()).subscribe({
      next: () => { this.editando.set(null); this.cargar(); },
    });
  }

  private draftVacio(): Draft {
    return { categoriaId: null, marca: '', nombre: '', notas: '', activo: true, presentaciones: [] };
  }
}
