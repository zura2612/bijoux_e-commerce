import { create } from 'zustand';
import { api } from '../utils/api';
import type { Cart, CartItem } from '../types';

interface CartState {
  cart: Cart;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const emptyCart: Cart = { items: [], totalCents: 0 };

function computeCart(items: CartItem[]): Cart {
  return {
    items,
    totalCents: items.reduce((s, i) => s + i.priceCents * i.quantity, 0),
  };
}

export const useCartStore = create<CartState>((set) => ({
  cart: emptyCart,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/cart');
      set({ cart: data.data });
    } catch {
      set({ cart: emptyCart });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity) => {
    const { data } = await api.post('/cart/items', { productId, quantity });
    // Le backend retourne { items: CartRow[], totalCents }
    set({ cart: data.data });
  },

  updateItem: async (productId, quantity) => {
    const { data } = await api.put(`/cart/items/${productId}`, { quantity });
    set({ cart: data.data });
  },

  clearCart: async () => {
    await api.delete('/cart');
    set({ cart: emptyCart });
  },
}));
