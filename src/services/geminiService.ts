import { GoogleGenAI, Type } from '@google/genai';
import { ClientData } from '../types';

export async function extractClientData(text: string): Promise<ClientData> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extrae la siguiente información del cliente a partir de este texto desordenado: Nombre completo, Dirección, Teléfono, y Transporte (ej: Propio, CargoTrans, etc.). Si no encuentras algún dato, déjalo vacío.\n\nTexto:\n${text}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING, description: 'Nombre completo del cliente' },
            address: { type: Type.STRING, description: 'Dirección del cliente' },
            phone: { type: Type.STRING, description: 'Número de teléfono del cliente' },
            transport: { type: Type.STRING, description: 'Método o empresa de transporte' },
          },
          required: ['fullName', 'address', 'phone', 'transport'],
        },
      },
    });

    const jsonStr = response.text?.trim() || '{}';
    const data = JSON.parse(jsonStr);
    return {
      fullName: data.fullName || '',
      address: data.address || '',
      phone: data.phone || '',
      transport: data.transport || '',
    };
  } catch (error) {
    console.error('Error extracting client data:', error);
    throw new Error('No se pudo extraer la información del cliente.');
  }
}
