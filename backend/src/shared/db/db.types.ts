// fichier backend/src/shared/db/db.types.ts
// Représentation exacte des lignes telles qu'elles sortent de SQLite

export interface UserRow {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'admin';
  blocked: number; // 0 | 1
  created_at: string;
}

export interface ProductRow {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  stock: number;
  category_id: number;
  image_url: string;
  created_at: string;
  is_new: number; // 0 | 1
}

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
}

export interface AddressRow {
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
  is_default: number; // 0 | 1
  created_at: string;
}

export interface OrderRow {
  id: string;
  user_id: string;
  status: string;
  total_cents: number;
  address: string;
  created_at: string;
  paid_at: string | null;
}

export interface OrderItemRow {
  id: number;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
}

export interface CartItemRow {
  id: number;
  user_id: string;
  product_id: string;
  quantity: number;
}

export interface OrderCounterRow {
  year: number;
  counter: number;
}