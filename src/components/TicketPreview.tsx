import React, { forwardRef } from 'react';
import { InvoiceData } from '../types';
import { PANDA_STORE_INFO } from '../constants';

interface Props {
  data: InvoiceData;
}

export const TicketPreview = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
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
    <div ref={ref} className="bg-white text-black p-6 font-mono text-sm mx-auto shadow-lg" style={{ width: '384px' }}>
      {/* Logo */}
      <div className="flex flex-col items-center mb-4 text-center">
        {data.mainLogo ? (
          <img 
            src={data.mainLogo} 
            alt="Logo" 
            className="w-24 h-24 object-contain mb-2" 
            style={{ filter: 'grayscale(100%) contrast(1.2)' }} 
          />
        ) : (
          <div className="w-24 h-24 border-2 border-black flex items-center justify-center font-bold text-xl mb-2">
            LOGO
          </div>
        )}
        <h1 className="font-bold text-2xl uppercase">{PANDA_STORE_INFO.name}</h1>
        <p className="text-xs mt-1">{PANDA_STORE_INFO.address}</p>
        <p className="text-xs">{PANDA_STORE_INFO.phone}</p>
        <p className="text-xs">{PANDA_STORE_INFO.email}</p>
      </div>

      <div className="border-b-2 border-dashed border-black my-4"></div>

      {/* Invoice Info */}
      <div className="mb-4 text-sm">
        <div className="flex justify-between">
          <span className="font-bold">TICKET:</span>
          <span>{data.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">FECHA:</span>
          <span>{data.date}</span>
        </div>
      </div>

      <div className="border-b-2 border-dashed border-black my-4"></div>

      {/* Client Info */}
      <div className="mb-4 text-sm space-y-1">
        <p><span className="font-bold">CLIENTE:</span> {data.client.fullName || 'Consumidor Final'}</p>
        {data.client.phone && <p><span className="font-bold">TEL:</span> {data.client.phone}</p>}
        {data.client.address && <p><span className="font-bold">DIR:</span> {data.client.address}</p>}
        {data.client.transport && <p><span className="font-bold">ENVÍO:</span> {data.client.transport}</p>}
      </div>

      <div className="border-b-2 border-dashed border-black my-4"></div>

      {/* Items */}
      <div className="mb-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 w-12">CANT</th>
              <th className="py-1">DESC</th>
              <th className="py-1 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-2">{item.quantity}</td>
                <td className="py-2 pr-2">
                  {item.productName}
                  <div className="text-xs mt-0.5">{item.quantity} x C${Number(item.priceNIO || 0).toFixed(2)}</div>
                </td>
                <td className="py-2 text-right">C${(Number(item.priceNIO || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center italic text-xs">Sin artículos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-b-2 border-dashed border-black my-4"></div>

      {/* Totals */}
      <div className="mb-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>C$ {grossTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>ENVÍO:</span>
          <span>C$ {data.shippingCostNIO.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>DESCUENTO:</span>
          <span>-C$ {data.discountNIO.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t-2 border-black">
          <span>TOTAL:</span>
          <span>C$ {netTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-b-2 border-dashed border-black my-4"></div>

      {/* Notes & Warranty */}
      <div className="text-xs text-center space-y-3">
        {data.customNote && (
          <div className="border border-black p-2 text-left">
            <span className="font-bold">NOTA:</span> {data.customNote}
          </div>
        )}
        <div className="text-left">
          <p className="uppercase font-bold mb-1 text-center">Términos y Garantía</p>
          <p className="whitespace-pre-wrap">{data.warrantyText}</p>
        </div>
        <p className="mt-4 font-bold text-sm">¡GRACIAS POR SU COMPRA!</p>
        <p className="text-[10px] mt-1">Generado por PandaStore</p>
      </div>
    </div>
  );
});

TicketPreview.displayName = 'TicketPreview';
