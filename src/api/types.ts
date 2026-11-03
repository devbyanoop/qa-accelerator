export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  in_stock: boolean;
  is_rental: boolean;
  is_eco_friendly: boolean;
}

export interface Page<T> {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface CartItem {
  id: string;
  quantity: number;
  cart_id: string;
  product_id: string;
}

export interface Cart {
  id: string;
  cart_items: CartItem[];
}

export type ProductSort = 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';
