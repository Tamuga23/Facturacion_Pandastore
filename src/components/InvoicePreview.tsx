import React, { forwardRef } from 'react';
import { InvoiceData, InvoiceItem } from '../types';
import { PANDA_STORE_INFO, DEFAULT_PAYMENT_TERMS } from '../constants';

interface Props {
  data: InvoiceData;
}

const PAGE_HEIGHT_LIMIT = 1050; // A4 height is ~1123px, leaving margin
const HEADER_HEIGHT = 320;
const FOOTER_HEIGHT = 280;
const TABLE_HEADER_HEIGHT = 40;

export const InvoicePreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  // Logical Pagination
  const pages: { items: InvoiceItem[], showHeader: boolean, showFooter: boolean }[] = [];
  let currentItems: InvoiceItem[] = [];
  let currentHeight = HEADER_HEIGHT + TABLE_HEADER_HEIGHT;

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const itemHeight = item.image ? 70 : 40;
    
    if (currentHeight + itemHeight > PAGE_HEIGHT_LIMIT - 50) {
      pages.push({ items: currentItems, showHeader: pages.length === 0, showFooter: false });
      currentItems = [item];
      currentHeight = TABLE_HEADER_HEIGHT + itemHeight;
    } else {
      currentItems.push(item);
      currentHeight += itemHeight;
    }
  }

  if (currentHeight + FOOTER_HEIGHT > PAGE_HEIGHT_LIMIT - 50) {
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
            <div className="mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#1a6ba0' }}>FACTURA</h1>
                  <p className="text-gray-600 mt-1 font-medium">Nº {data.invoiceNumber}</p>
                  <p className="text-gray-600">Fecha: {data.date}</p>
                </div>
                {data.mainLogo ? (
                  <img src={data.mainLogo} alt="Logo" className="w-32 h-32 object-contain" />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl rounded">
                    LOGO
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: '#dff3fa' }}>
                  <h3 className="font-bold mb-2 text-sm" style={{ color: '#0e5c7a' }}>FACTURADO POR:</h3>
                  <p className="font-bold text-gray-800 text-sm">{PANDA_STORE_INFO.name}</p>
                  <p className="text-sm text-gray-700">{PANDA_STORE_INFO.address}</p>
                  <p className="text-sm text-gray-700">{PANDA_STORE_INFO.email}</p>
                  <p className="text-sm text-gray-700">{PANDA_STORE_INFO.phone}</p>
                </div>
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: '#dff3fa' }}>
                  <h3 className="font-bold mb-2 text-sm" style={{ color: '#0e5c7a' }}>FACTURADO A:</h3>
                  <p className="font-bold text-gray-800 text-sm">{data.client.fullName || 'Nombre del Cliente'}</p>
                  <p className="text-sm text-gray-700">{data.client.address || 'Dirección'}</p>
                  <p className="text-sm text-gray-700">{data.client.phone || 'Teléfono'}</p>
                  <p className="text-sm text-gray-700 font-medium mt-1">Transporte: {data.client.transport || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {(page.items.length > 0 || page.showHeader) && (
            <div className="flex-grow">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#0e5c7a', color: 'white' }}>
                    <th className="p-2 text-sm font-semibold w-1/2">ARTÍCULO</th>
                    <th className="p-2 text-sm font-semibold text-center">CANT.</th>
                    <th className="p-2 text-sm font-semibold text-right">PRECIO C$</th>
                    <th className="p-2 text-sm font-semibold text-right">PRECIO $</th>
                    <th className="p-2 text-sm font-semibold text-right">TOTAL C$</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item, idx) => (
                    <tr key={item.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="p-2 flex items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt={item.productName} className="w-12 h-12 object-cover rounded border border-gray-300" />
                        )}
                        <span className="text-sm font-medium text-gray-800">{item.productName}</span>
                      </td>
                      <td className="p-2 text-sm text-center text-gray-700">{item.quantity}</td>
                      <td className="p-2 text-sm text-right text-gray-700">C$ {Number(item.priceNIO || 0).toFixed(2)}</td>
                      <td className="p-2 text-sm text-right text-gray-700">$ {Number(item.priceUSD || 0).toFixed(2)}</td>
                      <td className="p-2 text-sm text-right font-medium text-gray-800">C$ {(Number(item.priceNIO || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                  {page.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-sm text-gray-500 italic">
                        No hay artículos en esta página.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {page.showFooter && (
            <div className="mt-auto pt-8">
              <div className="flex gap-6 mb-8">
                <div className="flex-1">
                  {data.customNote && (
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 h-full">
                      <h4 className="font-bold text-sm mb-1" style={{ color: '#0e5c7a' }}>NOTA:</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.customNote}</p>
                    </div>
                  )}
                </div>
                <div className="w-1/3">
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Monto Bruto:</span>
                    <span className="text-sm font-medium text-gray-800">C$ {grossTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Costo de Envío:</span>
                    <span className="text-sm font-medium text-gray-800">C$ {data.shippingCostNIO.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Descuento:</span>
                    <span className="text-sm font-medium text-red-600">- C$ {data.discountNIO.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 mt-1">
                    <span className="text-base font-bold" style={{ color: '#1a6ba0' }}>TOTAL:</span>
                    <span className="text-base font-bold" style={{ color: '#1a6ba0' }}>C$ {netTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4">
                <div className="mb-2">
                  <h4 className="font-bold text-xs uppercase" style={{ color: '#0e5c7a' }}>Pago</h4>
                  <p className="text-xs text-gray-600">{DEFAULT_PAYMENT_TERMS}</p>
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase" style={{ color: '#0e5c7a' }}>Garantía</h4>
                  <p className="text-xs text-gray-600">{data.warrantyText}</p>
                </div>
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
