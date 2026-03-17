// fichier frontend/src/types/index.ts
export interface Address {
  id: number;
  user_id: string;
  label: string;
  first_name: string;
  last_name: string;
  line1: string;
  line2: string;
  postal_code: string;
  city: string;
  country: string;
  is_default: number; // 1 | 0
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  role: 'client' | 'admin';
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  stock: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  image_url: string;
  created_at: string;
  is_new: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl: string;
}

export interface Cart {
  items: CartItem[];
  totalCents: number;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  image_url?: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  total_cents: number;
  address: string;
  created_at: string;
  tracking_number: string | null;
  items: OrderItem[];
}

export interface PaginationType {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
