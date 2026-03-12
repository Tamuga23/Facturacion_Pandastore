import React, { useState, useRef, useEffect } from 'react';
import { Upload, Plus, Trash2, Download, Wand2, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

import { InvoiceData, InvoiceItem, ClientData } from './types';
import { EXCHANGE_RATE, PRODUCT_CATALOG, DEFAULT_WARRANTY_TEXT } from './constants';
import { extractClientData } from './services/geminiService';
import { InvoicePreview } from './components/InvoicePreview';
import { TicketPreview } from './components/TicketPreview';

export default function App() {
  const [invoiceNumber, setInvoiceNumber] = useState(1237);
  const [date, setDate] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [mainLogo, setMainLogo] = useState<string | undefined>(undefined);
  
  const [clientText, setClientText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [clientData, setClientData] = useState<ClientData>({
    fullName: '',
    address: '',
    phone: '',
    transport: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [shippingCostNIO, setShippingCostNIO] = useState(0);
  const [discountNIO, setDiscountNIO] = useState(0);
  const [customNote, setCustomNote] = useState('');
  const [warrantyText, setWarrantyText] = useState(DEFAULT_WARRANTY_TEXT);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewMode, setPreviewMode] = useState<'invoice' | 'ticket'>('invoice');
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const ticketPreviewRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractClientData = async () => {
    if (!clientText.trim()) return;
    setIsExtracting(true);
    try {
      const extracted = await extractClientData(clientText);
      setClientData(extracted);
    } catch (error) {
      alert('Error al extraer datos. Por favor, revisa tu conexión o intenta manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 1,
      priceNIO: 0,
      priceUSD: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill product name and default price when selecting a product
        if (field === 'productId') {
          const product = PRODUCT_CATALOG.find(p => p.id === value);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.priceUSD = product.defaultPriceUSD;
            updatedItem.priceNIO = parseFloat((product.defaultPriceUSD * EXCHANGE_RATE).toFixed(2));
          }
        }
        
        // Auto-calculate USD when NIO changes
        if (field === 'priceNIO') {
          const nio = parseFloat(value);
          if (!isNaN(nio)) {
            updatedItem.priceUSD = parseFloat((nio / EXCHANGE_RATE).toFixed(2));
          }
        }
        
        // Auto-calculate NIO when USD changes
        if (field === 'priceUSD') {
          const usd = parseFloat(value);
          if (!isNaN(usd)) {
            updatedItem.priceNIO = parseFloat((usd * EXCHANGE_RATE).toFixed(2));
          }
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const handleItemImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleItemChange(id, 'image', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const invoiceData: InvoiceData = {
    invoiceNumber: `A${invoiceNumber.toString().padStart(6, '0')}`,
    date,
    client: clientData,
    items,
    shippingCostNIO,
    discountNIO,
    customNote,
    warrantyText,
    mainLogo,
  };

  const registerSaleInExcel = async (data: InvoiceData) => {
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbxhToto-MFJzbEJX2Mb-HK2VTGUbr1u_V0OpppjR3IU0YFPE6HVljjspQ3G3mc715_D/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(data),
        redirect: 'follow' // Importante para Google Apps Script
      });
      
      // Leemos la respuesta como texto primero para poder depurar si no es JSON
      const responseText = await response.text();
      console.log("Respuesta cruda de Google Apps Script:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error al parsear JSON. La respuesta del servidor no es JSON válido.");
        setFeedback({ message: 'PDF guardado, pero falló el registro (Respuesta inválida)', type: 'error' });
        setTimeout(() => setFeedback(null), 5000);
        return;
      }

      if (result.status === 'success') {
        setFeedback({ message: 'PDF generado y venta registrada en Excel', type: 'success' });
      } else {
        console.error("El script devolvió un error:", result);
        setFeedback({ message: 'PDF guardado, pero falló el registro en Excel', type: 'error' });
      }
    } catch (error) {
      console.error('Error de red o CORS al registrar la venta:', error);
      setFeedback({ message: 'PDF guardado, pero falló el registro en Excel', type: 'error' });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  const incrementConsecutiveCode = () => {
    setInvoiceNumber(prev => prev + 1);
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setIsGeneratingPDF(true);
    setFeedback(null);
    
    try {
      const pages = previewRef.current.querySelectorAll('.invoice-page');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toPng(page, { quality: 1, pixelRatio: 2 });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (page.offsetHeight * pdfWidth) / page.offsetWidth;
        
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`Factura_A${invoiceNumber.toString().padStart(6, '0')}.pdf`);
      await registerSaleInExcel(invoiceData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      incrementConsecutiveCode();
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadTicketPDF = async () => {
    if (!ticketPreviewRef.current) return;
    setIsGeneratingPDF(true);
    setFeedback(null);
    
    try {
      const ticketElement = ticketPreviewRef.current;
      const dataUrl = await toPng(ticketElement, { quality: 1, pixelRatio: 2 });
      
      const mmWidth = 100; // 4 inches is ~101.6mm, 100mm is standard for wide thermal
      const pxWidth = ticketElement.offsetWidth;
      const pxHeight = ticketElement.offsetHeight;
      const mmHeight = (pxHeight * mmWidth) / pxWidth;
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [mmWidth, mmHeight]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, mmWidth, mmHeight);
      pdf.save(`Ticket_A${invoiceNumber.toString().padStart(6, '0')}.pdf`);
      await registerSaleInExcel(invoiceData);
    } catch (error) {
      console.error('Error generating Ticket PDF:', error);
      alert('Hubo un error al generar el Ticket.');
    } finally {
      incrementConsecutiveCode();
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {feedback && (
        <div className={`fixed top-6 right-6 p-4 rounded-xl shadow-xl z-50 text-white font-medium transition-all flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {feedback.message}
        </div>
      )}
      {/* Left Panel: Controls */}
      <div className="w-1/2 h-full overflow-y-auto border-r border-gray-200 bg-white p-6 shadow-sm z-10">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Generador de Facturas</h1>
        </div>

        {/* General Info */}
        <section className="mb-8 bg-gray-50 p-5 rounded-xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
            Información General
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº Factura</label>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-r-0 border-gray-300 px-3 py-2 rounded-l-md text-gray-500">A</span>
                <input 
                  type="number" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-r-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input 
                type="text" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Principal</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Subir Logo</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {mainLogo && <span className="text-sm text-green-600 font-medium flex items-center gap-1">✓ Logo cargado</span>}
            </div>
          </div>
        </section>

        {/* Client Data & AI */}
        <section className="mb-8 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
            Datos del Cliente
          </h2>
          
          <div className="mb-6 bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-500" />
              Extracción Inteligente (IA)
            </label>
            <textarea 
              value={clientText}
              onChange={(e) => setClientText(e.target.value)}
              placeholder="Pega aquí los datos desordenados del cliente (ej: Juan Pérez, vive en Linda Vista, tel 8888-8888, mandar por CargoTrans)"
              className="w-full border border-gray-300 rounded-md p-3 h-24 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
            />
            <button 
              onClick={handleExtractClientData}
              disabled={isExtracting || !clientText.trim()}
              className="mt-3 flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 px-4 rounded-md font-medium transition-colors shadow-sm"
            >
              {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isExtracting ? 'Extrayendo...' : 'Extraer Datos con IA'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input 
                type="text" 
                value={clientData.fullName} 
                onChange={(e) => setClientData({...clientData, fullName: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input 
                type="text" 
                value={clientData.address} 
                onChange={(e) => setClientData({...clientData, address: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input 
                type="text" 
                value={clientData.phone} 
                onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transporte</label>
              <input 
                type="text" 
                value={clientData.transport} 
                onChange={(e) => setClientData({...clientData, transport: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              Artículos
            </h2>
            <button 
              onClick={handleAddItem}
              className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar Artículo
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative group">
                <button 
                  onClick={() => handleRemoveItem(item.id)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shadow-sm"
                  title="Eliminar artículo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Producto</label>
                    <select 
                      value={item.productId}
                      onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                    >
                      <option value="">Seleccionar producto...</option>
                      {PRODUCT_CATALOG.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      value={item.productName}
                      onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                      placeholder="Nombre personalizado..."
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Cant.</label>
                    <input 
                      type="number" 
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Precio C$</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.priceNIO || ''}
                      onChange={(e) => handleItemChange(item.id, 'priceNIO', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Precio $</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.priceUSD || ''}
                      onChange={(e) => handleItemChange(item.id, 'priceUSD', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded cursor-pointer transition-colors">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {item.image ? 'Cambiar Foto' : 'Añadir Foto'}
                    <input type="file" accept="image/*" onChange={(e) => handleItemImageUpload(item.id, e)} className="hidden" />
                  </label>
                  {item.image && <span className="text-xs text-green-600 flex items-center gap-1">✓ Foto añadida</span>}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                <p className="text-gray-500 text-sm">No hay artículos en la factura.</p>
                <button 
                  onClick={handleAddItem}
                  className="mt-2 text-blue-600 text-sm font-medium hover:underline"
                >
                  Agregar el primer artículo
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Totals & Notes */}
        <section className="mb-8 bg-gray-50 p-5 rounded-xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
            Totales y Notas
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo de Envío (C$)</label>
                <input 
                  type="number" 
                  value={shippingCostNIO || ''} 
                  onChange={(e) => setShippingCostNIO(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (C$)</label>
                <input 
                  type="number" 
                  value={discountNIO || ''} 
                  onChange={(e) => setDiscountNIO(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota Personalizada</label>
                <textarea 
                  value={customNote} 
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Ej: Se entrega MicroSD Clase 10 de 32GB"
                  className="w-full border border-gray-300 rounded-md p-2 h-20 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto de Garantía</label>
                <textarea 
                  value={warrantyText} 
                  onChange={(e) => setWarrantyText(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 h-20 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white pt-4 pb-6 border-t border-gray-200 mt-8 flex flex-col gap-3">
          <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || items.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            {isGeneratingPDF ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
            Descargar Factura (A4)
          </button>
          <button 
            onClick={handleDownloadTicketPDF}
            disabled={isGeneratingPDF || items.length === 0}
            className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white py-3 px-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            {isGeneratingPDF ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
            Descargar Ticket (4")
          </button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="w-1/2 h-full overflow-y-auto bg-gray-200 flex flex-col items-center p-8">
        {/* Toggle */}
        <div className="bg-white p-1 rounded-lg shadow-sm mb-6 flex gap-1 z-10">
          <button 
            onClick={() => setPreviewMode('invoice')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${previewMode === 'invoice' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Vista Factura (A4)
          </button>
          <button 
            onClick={() => setPreviewMode('ticket')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${previewMode === 'ticket' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Vista Ticket (4")
          </button>
        </div>

        <div className="transform origin-top scale-90 xl:scale-100 transition-transform w-full flex justify-center">
          {/* We wrap InvoicePreview in a div to apply scaling for smaller screens without affecting the actual render size for PDF */}
          <div className={previewMode === 'invoice' ? 'block' : 'absolute -left-[9999px] opacity-0 pointer-events-none'}>
            <InvoicePreview data={invoiceData} ref={previewRef} />
          </div>
          <div className={previewMode === 'ticket' ? 'block' : 'absolute -left-[9999px] opacity-0 pointer-events-none'}>
            <TicketPreview data={invoiceData} ref={ticketPreviewRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
