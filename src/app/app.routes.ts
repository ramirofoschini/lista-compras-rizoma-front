import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/datos/datos').then((m) => m.Datos) },
  { path: 'catalogo', loadComponent: () => import('./pages/catalogo/catalogo').then((m) => m.Catalogo) },
  { path: 'resumen', loadComponent: () => import('./pages/resumen/resumen').then((m) => m.Resumen) },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin) },
  { path: '**', redirectTo: '' },
];
