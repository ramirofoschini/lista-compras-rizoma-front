import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PedidoResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class PdfService {
  /** Genera y descarga el PDF del pedido (comprobante para el cliente). */
  descargarPedidoPdf(p: PedidoResponse): void {
    const doc = new jsPDF();
    const verde: [number, number, number] = [74, 124, 89];

    doc.setFontSize(20);
    doc.setTextColor(...verde);
    doc.text('RIZOMA', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text('Bio almacén orgánico', 14, 26);

    doc.setTextColor(30);
    doc.setFontSize(13);
    doc.text(`Pedido #${p.id}`, 14, 38);
    doc.setFontSize(10);
    doc.setTextColor(70);
    doc.text(`Cliente: ${p.cliente.nombre} ${p.cliente.apellido}`, 14, 46);
    doc.text(`Dirección: ${p.cliente.direccion}`, 14, 51);
    doc.text(`Celular: ${p.cliente.celular}`, 14, 56);
    if (p.diaEntrega) doc.text(`Día de entrega: ${p.diaEntrega}`, 14, 61);

    autoTable(doc, {
      startY: 68,
      head: [['Producto', 'Present.', 'Cant.', 'P. unit.', 'Subtotal']],
      body: p.items.map((i) => [
        i.nombreProducto,
        i.etiqueta ?? '-',
        String(i.cantidad),
        this.money(i.precioUnitario),
        this.money(i.subtotal),
      ]),
      foot: [['', '', '', 'TOTAL', this.money(p.total)]],
      headStyles: { fillColor: verde },
      footStyles: { fillColor: [240, 240, 235], textColor: 20, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });

    doc.save(`pedido-rizoma-${p.id}.pdf`);
  }

  /** Arma el texto del pedido para enviar por WhatsApp. */
  textoWhatsapp(p: PedidoResponse): string {
    const lineas: string[] = [
      `*PEDIDO RIZOMA #${p.id}*`,
      `${p.cliente.nombre} ${p.cliente.apellido}`,
      `Dirección: ${p.cliente.direccion}`,
      `Celular: ${p.cliente.celular}`,
    ];
    if (p.diaEntrega) lineas.push(`Entrega: ${p.diaEntrega}`);
    lineas.push('', '*Productos:*');
    for (const i of p.items) {
      const et = i.etiqueta ? ` (${i.etiqueta})` : '';
      lineas.push(`• ${i.cantidad}x ${i.nombreProducto}${et} — ${this.money(i.subtotal)}`);
    }
    lineas.push('', `*TOTAL: ${this.money(p.total)}*`);
    return lineas.join('\n');
  }

  urlWhatsapp(destino: string, texto: string): string {
    return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
  }

  private money(n: number): string {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }
}
