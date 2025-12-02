export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  customerName: string;
  issuerName: string;
  products: Product[];
  date: Date;
  subtotal: number;
  tax: number;
  total: number;
}
