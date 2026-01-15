/**
 * API Client for PHP Backend
 * Handles all HTTP requests to the PHP REST API
 */

import { API_URL } from './config';

// Types
export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  created_at?: string;
}

export interface ProductInput {
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface InvoiceProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  company_name: string;
  company_address?: string;
  company_phone?: string;
  customer_name: string;
  issuer_name: string;
  subtotal: number;
  tax: number;
  total: number;
  products: InvoiceProduct[];
  created_at: string;
}

export interface InvoiceInput {
  invoice_number: string;
  company_name: string;
  company_address?: string;
  company_phone?: string;
  customer_name: string;
  issuer_name: string;
  subtotal: number;
  tax: number;
  total: number;
  products: InvoiceProduct[];
}

export interface DashboardStats {
  totalSales: number;
  totalProducts: number;
  totalInvoices: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    category: string;
  }>;
}

export interface AnalysisData {
  weeklyData: Array<{ date: string; total: number; count: number }>;
  monthlyData: Array<{ date: string; total: number; count: number }>;
  thisWeekTotal: number;
  lastWeekTotal: number;
  thisMonthTotal: number;
  lastMonthTotal: number;
}

export interface TaxData {
  monthlyData: Array<{
    month: string;
    tax: number;
    sales: number;
    invoiceCount: number;
  }>;
  quarterlyData: Array<{
    quarter: string;
    tax: number;
    sales: number;
    invoiceCount: number;
  }>;
  totalTax: number;
  totalSales: number;
  totalInvoices: number;
  availableYears: number[];
  selectedYear: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  // Token management
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    localStorage.removeItem('auth_token');
  }

  // Helper method for making requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // ==================== AUTH ====================

  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register.php', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  logout(): void {
    this.clearToken();
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.request<{ user: User }>('/auth/me.php');
      return response.user;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ==================== PRODUCTS ====================

  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products/index.php');
  }

  async createProduct(data: ProductInput): Promise<Product> {
    return this.request<Product>('/products/index.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<ProductInput>): Promise<Product> {
    return this.request<Product>(`/products/update.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/products/delete.php?id=${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== INVOICES ====================

  async getInvoices(filters?: {
    from?: string;
    to?: string;
    year?: number;
    limit?: number;
  }): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `/invoices/index.php${queryString ? `?${queryString}` : ''}`;
    
    return this.request<Invoice[]>(endpoint);
  }

  async createInvoice(data: InvoiceInput): Promise<{ id: string; invoice_number: string }> {
    return this.request<{ id: string; invoice_number: string }>('/invoices/index.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/invoices/delete.php?id=${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== STATS ====================

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/stats/dashboard.php');
  }

  async getAnalysisData(): Promise<AnalysisData> {
    return this.request<AnalysisData>('/stats/analysis.php');
  }

  async getTaxData(year?: number): Promise<TaxData> {
    const endpoint = year 
      ? `/stats/tax.php?year=${year}` 
      : '/stats/tax.php';
    return this.request<TaxData>(endpoint);
  }

  async getAvailableYears(): Promise<number[]> {
    const response = await this.request<{ years: number[] }>('/stats/years.php');
    return response.years;
  }
}

// Export singleton instance
export const api = new ApiClient();
