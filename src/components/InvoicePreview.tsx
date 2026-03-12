import React, { forwardRef } from 'react';
import { InvoiceData, InvoiceItem } from '../types';
import { PANDA_STORE_INFO, DEFAULT_PAYMENT_TERMS } from '../constants';

interface Props {
  data: InvoiceData;
}

const PAGE_HEIGHT_LIMIT = 980; // More conservative for A4
const HEADER_HEIGHT = 280;
const FOOTER_HEIGHT = 300;
const TABLE_HEADER_HEIGHT = 45;

export const InvoicePreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  // Logical Pagination
  const pages: { items: InvoiceItem[], showHeader: boolean, showFooter: boolean }[] = [];
  let currentItems: InvoiceItem[] = [];
  let currentHeight = HEADER_HEIGHT + TABLE_HEADER_HEIGHT;

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    // Compact height: image is 64px + padding (p-3 = 12px * 2) + border/margins
    const itemHeight = item.image ? 95 : 55;
    
    if (currentHeight + itemHeight > PAGE_HEIGHT_LIMIT) {
      pages.push({ items: currentItems, showHeader: pages.length === 0, showFooter: false });
      currentItems = [item];
      currentHeight = TABLE_HEADER_HEIGHT + itemHeight;
    } else {
      currentItems.push(item);
      currentHeight += itemHeight;
    }
  }

  // Check if footer fits on the last page
  if (currentHeight + FOOTER_HEIGHT > PAGE_HEIGHT_LIMIT) {
    pages.push({ items: currentItems, showHeader: pages.length === 0, showFooter: false });
    pages.push({ items: [], showHeader: false, showFooter: true });
  } else {
    pages.push({ items: currentItems, showHeader: pages.length === 0, showFooter: true });
  }

  if (pages.length === 0) {
    pages.push({ items: [], showHeader: true, showFooter: true });
  }

  const calculateGrossTotal = () => {
    return data.items.reduce((sum, item) => {
      const price = parseFloat(item.priceNIO as any) || 0;
      const qty = parseFloat(item.quantity as any) || 0;
      return sum + (price * qty);
    }, 0);
  };

  const grossTotal = calculateGrossTotal();
  const netTotal = grossTotal + data.shippingCostNIO - data.discountNIO;

  return (
    <div ref={ref} className="bg-gray-100 p-8 flex flex-col items-center gap-8 min-h-screen font-sans">
      {pages.map((page, pageIndex) => (
        <div 
          key={pageIndex} 
          className="invoice-page bg-white shadow-lg relative overflow-hidden flex flex-col"
          style={{ width: '794px', minHeight: '1123px', padding: '40px' }}
        >
          {/* Header */}
          {page.showHeader && (
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-5xl font-bold tracking-tight mb-1" style={{ color: '#1a6ba0' }}>Factura</h1>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex gap-2">
                      <span className="text-gray-600 font-bold min-w-[100px] text-sm">Factura No #</span>
                      <span className="text-gray-900 font-bold text-sm">{data.invoiceNumber}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-600 font-bold min-w-[100px] text-sm">Fecha:</span>
                      <span className="text-gray-900 font-bold text-sm">{data.date}</span>
                    </div>
                  </div>
                </div>
                {data.mainLogo ? (
                  <div className="bg-black p-2 rounded-2xl">
                    <img src={data.mainLogo} alt="Logo" className="w-20 h-20 object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl rounded-2xl">
                    LOGO
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: '#dff3fa' }}>
                  <h3 className="font-bold mb-2 text-[10px] uppercase tracking-wider" style={{ color: '#1a6ba0' }}>FACTURADO POR:</h3>
                  <div className="space-y-0.5">
                    <p className="font-bold text-gray-800 text-sm">{PANDA_STORE_INFO.name}</p>
                    <p className="text-xs text-gray-600 leading-tight">{PANDA_STORE_INFO.address}</p>
                    <p className="text-xs text-gray-600"><span className="font-bold">Correo:</span> {PANDA_STORE_INFO.email}</p>
                    <p className="text-xs text-gray-600"><span className="font-bold">Teléfono:</span> {PANDA_STORE_INFO.phone}</p>
                  </div>
                </div>
                <div className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: '#dff3fa' }}>
                  <h3 className="font-bold mb-2 text-[10px] uppercase tracking-wider" style={{ color: '#1a6ba0' }}>FACTURADO A:</h3>
                  <div className="space-y-0.5">
                    <p className="font-bold text-gray-800 text-sm uppercase">{data.client.fullName || 'Nombre del Cliente'}</p>
                    <p className="text-xs text-gray-600 leading-tight"><span className="font-bold">Dirección:</span> {data.client.address || 'Dirección'}</p>
                    <p className="text-xs text-gray-600">{data.client.phone || ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600 font-bold">Transporte:</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 bg-white text-blue-700 uppercase">
                        {data.client.transport || 'ENTREGA LOCAL'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {(page.items.length > 0 || page.showHeader) && (
            <div className="flex-grow">
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: '#0e5c7a', color: 'white' }}>
                      <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-center">ARTÍCULO</th>
                      <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-center">CANT.</th>
                      <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-center">PRECIO C$</th>
                      <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-center">PRECIO $</th>
                      <th className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                        <td className="p-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[9px] font-bold border border-blue-100">
                              {idx + 1}
                            </span>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-bold text-gray-800 leading-tight">{item.productName}</span>
                              {item.image && (
                                <img src={item.image} alt={item.productName} className="w-16 h-16 object-cover rounded-xl border border-gray-200 p-0.5 bg-white" />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-center text-gray-700 font-medium">{item.quantity}</td>
                        <td className="p-3 text-xs text-center text-gray-700 font-medium">C${Number(item.priceNIO || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-3 text-xs text-center text-gray-700 font-medium">${Number(item.priceUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-3 text-xs text-center font-bold" style={{ color: '#0e5c7a' }}>C${(Number(item.priceNIO || 0) * Number(item.quantity || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          {page.showFooter && (
            <div className="mt-auto pt-4">
              <div className="flex gap-4 mb-4 items-start">
                <div className="flex-1">
                  {data.customNote && (
                    <div className="p-3 rounded-2xl bg-blue-50/30 border border-blue-100 flex gap-2 items-start">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">NOTA</span>
                      <p className="text-xs text-gray-700 italic">"{data.customNote}"</p>
                    </div>
                  )}
                </div>
                <div className="w-[260px] p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Monto Bruto</span>
                      <span className="text-xs font-bold text-gray-700">C${grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Costo de Envío</span>
                      <span className="text-xs font-bold text-gray-700">C${data.shippingCostNIO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-red-500">Descuento</span>
                      <span className="text-xs font-bold text-red-500">-C${data.discountNIO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-lg font-bold" style={{ color: '#1a6ba0' }}>TOTAL (C$)</span>
                      <span className="text-xl font-black" style={{ color: '#1a6ba0' }}>C${netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div>
                  <h4 className="font-bold text-xs flex items-center gap-2 mb-1" style={{ color: '#1a6ba0' }}>
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    Pago
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-tight ml-3 whitespace-pre-wrap">{DEFAULT_PAYMENT_TERMS}</p>
                </div>
                <div>
                  <h4 className="font-bold text-xs flex items-center gap-2 mb-1" style={{ color: '#1a6ba0' }}>
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    Garantía
                  </h4>
                  <p className="text-[10px] text-gray-500 leading-tight ml-3 whitespace-pre-wrap">{data.warrantyText}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center gap-0.5 opacity-40">
                <div className="flex items-center gap-1.5 text-[9px] font-medium text-gray-600">
                  <span>Generado mediante</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    <span className="font-bold">PandaStore System</span>
                  </div>
                </div>
                <p className="text-[8px] text-gray-500">Este documento electrónico es válido sin firma autógrafa.</p>
              </div>
            </div>
          )}

          {/* Page Number */}
          <div className="absolute bottom-4 right-8 text-xs text-gray-400">
            Página {pageIndex + 1} de {pages.length}
          </div>
        </div>
      ))}
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
