import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private router = inject(Router);
  cart = inject(CartService);

  private urlSig = signal(this.router.url);

  // 1=datos, 2=catálogo, 3=resumen, 0=admin/otro (oculta stepper)
  paso = computed(() => {
    const u = this.urlSig();
    if (u.startsWith('/catalogo')) return 2;
    if (u.startsWith('/resumen')) return 3;
    if (u.startsWith('/admin')) return 0;
    return 1;
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.urlSig.set(e.urlAfterRedirects));
  }
}
