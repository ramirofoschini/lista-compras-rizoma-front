import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CategoriaItem, FolletoPreview, ImportResult, Producto } from '../../models';

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

      <!-- Importar folleto estilado (con previsualización) -->
      <section class="card">
        <h2>Importar folleto (con estilos)</h2>
        <p class="muted">Subí el folleto de Rizoma tal cual. Primero previsualizás qué entendió y después confirmás.</p>
        <input type="file" accept=".xlsx,.xls" (change)="onFolletoFile($event)" />
        <button class="btn btn-ghost" [disabled]="!folletoFile() || folletoPreviewing()" (click)="previsualizarFolleto()">
          {{ folletoPreviewing() ? 'Analizando…' : 'Previsualizar' }}
        </button>

        @if (folletoPreview(); as pv) {
          <div class="fo-prev">
            <p><strong>{{ pv.categorias }}</strong> categorías · <strong>{{ pv.productos }}</strong> productos · <strong>{{ pv.presentaciones }}</strong> presentaciones</p>
            @if (pv.avisos.length) {
              <details class="fo-avisos">
                <summary>⚠️ {{ pv.avisos.length }} aviso(s) — revisá antes de confirmar</summary>
                <ul>@for (a of pv.avisos; track a) { <li>{{ a }}</li> }</ul>
              </details>
            } @else {
              <p class="fo-ok">Sin avisos ✓</p>
            }
            <button class="btn btn-primary" [disabled]="folletoImporting()" (click)="confirmarFolleto()">
              {{ folletoImporting() ? 'Importando…' : 'Confirmar importación' }}
            </button>
          </div>
        }
        @if (folletoResult(); as r) {
          <div class="import-ok">✓ {{ r.productosCreados }} creados, {{ r.productosActualizados }} actualizados, {{ r.presentaciones }} presentaciones.</div>
        }
        @if (folletoError()) { <div class="error">{{ folletoError() }}</div> }
      </section>

      <!-- ABM de categorías (colapsable) -->
      <section class="card">
        <details class="cat-details">
          <summary class="cat-summary">Categorías <span class="muted">({{ categorias().length }})</span></summary>
          <div class="cat-body">
            <div class="cat-nueva">
              <input placeholder="Nueva categoría" [ngModel]="nuevaCat()" (ngModelChange)="nuevaCat.set($event)" name="nuevaCat" />
              <input type="color" class="color-pick" [ngModel]="nuevaColor()" (ngModelChange)="nuevaColor.set($event)" name="nuevaColor" title="Color de la tarjeta" />
              <button class="btn btn-primary" (click)="crearCategoria()">+ Crear</button>
            </div>
            <div class="cat-head"><span>Nombre</span><span>Orden</span><span>Color</span><span>Activa</span><span></span></div>
            @for (c of categorias(); track c.id) {
              <div class="cat-row">
                <input [(ngModel)]="c.nombre" [name]="'cn' + c.id" />
                <input type="number" [(ngModel)]="c.orden" [name]="'co' + c.id" />
                <input type="color" class="color-pick" [ngModel]="c.color || '#4a7c59'" (ngModelChange)="c.color = $event" [name]="'ck' + c.id" title="Color de la tarjeta" />
                <label class="chk"><input type="checkbox" [(ngModel)]="c.activa" [name]="'ca' + c.id" /></label>
                <button class="btn btn-ghost" (click)="guardarCategoria(c)">Guardar</button>
              </div>
            }
          </div>
        </details>
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
    .fo-prev { margin-top: 0.7rem; border-top: 1px solid var(--linea); padding-top: 0.7rem; }
    .fo-ok { color: var(--verde-osc); font-weight: 600; }
    .fo-avisos { margin: 0.5rem 0; }
    .fo-avisos summary { cursor: pointer; color: #b06a00; font-weight: 600; }
    .fo-avisos ul { max-height: 220px; overflow: auto; font-size: 0.82rem; color: var(--gris); margin: 0.4rem 0; padding-left: 1.1rem; }
    .cat-details summary { cursor: pointer; }
    .cat-summary { font-size: 1.15rem; font-weight: 600; }
    .cat-body { margin-top: 0.9rem; }
    .cat-nueva { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
    .cat-nueva input { flex: 1; }
    .cat-head, .cat-row { display: grid; grid-template-columns: 1fr 64px 48px 56px auto; gap: 0.5rem; align-items: center; }
    .cat-head { font-size: 0.75rem; color: var(--gris); font-weight: 600; margin-bottom: 0.3rem; }
    .cat-head span:nth-child(2), .cat-head span:nth-child(3), .cat-head span:nth-child(4) { text-align: center; }
    .cat-row { margin-bottom: 0.4rem; }
    .cat-row input[type="number"] { text-align: center; }
    .cat-row .chk { justify-content: center; margin: 0; }
    .color-pick { width: 48px; height: 34px; padding: 2px; border: 1px solid var(--linea); border-radius: 8px; cursor: pointer; flex: none; }
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
  nuevaColor = signal('#4a7c59');
  filtro = signal('');

  archivo = signal<File | null>(null);
  importando = signal(false);
  importResult = signal<{ productosCreados: number; productosActualizados: number; presentaciones: number; avisos: string[] } | null>(null);
  importError = signal<string | null>(null);

  folletoFile = signal<File | null>(null);
  folletoPreview = signal<FolletoPreview | null>(null);
  folletoPreviewing = signal(false);
  folletoImporting = signal(false);
  folletoResult = signal<ImportResult | null>(null);
  folletoError = signal<string | null>(null);

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
    this.api.adminGuardarCategoria({ nombre, activa: true, color: this.nuevaColor() }, this.user(), this.pass()).subscribe({
      next: () => { this.nuevaCat.set(''); this.cargarCategorias(); },
      error: (e) => alert(e?.error?.message || 'No se pudo crear la categoría.'),
    });
  }

  guardarCategoria(c: CategoriaItem): void {
    this.api.adminGuardarCategoria({ nombre: c.nombre, orden: c.orden, activa: c.activa, color: c.color }, this.user(), this.pass(), c.id).subscribe({
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

  onFolletoFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.folletoFile.set(input.files?.[0] ?? null);
    this.folletoPreview.set(null);
    this.folletoResult.set(null);
    this.folletoError.set(null);
  }

  previsualizarFolleto(): void {
    const f = this.folletoFile();
    if (!f) return;
    this.folletoPreviewing.set(true);
    this.folletoError.set(null);
    this.folletoResult.set(null);
    this.api.adminPreviewFolleto(f, this.user(), this.pass()).subscribe({
      next: (pv) => { this.folletoPreview.set(pv); this.folletoPreviewing.set(false); },
      error: (e) => { this.folletoError.set(e?.error?.message || 'No se pudo analizar el folleto.'); this.folletoPreviewing.set(false); },
    });
  }

  confirmarFolleto(): void {
    const f = this.folletoFile();
    if (!f) return;
    this.folletoImporting.set(true);
    this.folletoError.set(null);
    this.api.adminImportarFolleto(f, this.user(), this.pass()).subscribe({
      next: (r) => {
        this.folletoResult.set(r);
        this.folletoPreview.set(null);
        this.folletoImporting.set(false);
        this.cargar();
        this.cargarCategorias();
      },
      error: (e) => { this.folletoError.set(e?.error?.message || 'No se pudo importar el folleto.'); this.folletoImporting.set(false); },
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
