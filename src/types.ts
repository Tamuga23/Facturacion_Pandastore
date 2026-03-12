export interface Product {
  id: string;
  name: string;
  defaultPriceUSD: number;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  priceNIO: number;
  priceUSD: number;
  image?: string;
}

export interface ClientData {
  fullName: string;
  address: string;
  phone: string;
  transport: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  client: ClientData;
  items: InvoiceItem[];
  shippingCostNIO: number;
  discountNIO: number;
  customNote: string;
  warrantyText: string;
  mainLogo?: string;
}
