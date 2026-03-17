// fichier frontend/src/store/auth.store.ts
import { create } from 'zustand';
import { api, setAccessToken, getAccessToken } from '../utils/api';
import { useCartStore } from './cart.store';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      // Étape 1 : tenter un refresh pour obtenir un access token frais
      // (nécessaire après un reload de page car le token en mémoire est perdu)
      const refreshRes = await api.post('/auth/refresh');
      setAccessToken(refreshRes.data.accessToken);

      // Étape 2 : récupérer les infos utilisateur avec le token frais
      const meRes = await api.get('/auth/me');
      set({ user: meRes.data.user, loading: false });
    } catch {
      // Pas de refresh token valide → non connecté
      setAccessToken(null);
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
console.log('auth.store.ts login');
    set({ user: data.user });
  },

  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setAccessToken(data.accessToken);
console.log('auth.store.ts register');
    set({ user: data.user });
  },

  logout: async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
// pour mise à vide du panier qui sera affiché
    useCartStore.setState({ cart: { items: [], totalCents: 0 } });
console.log('auth.store.ts logout');
    set({ user: null });
  },
}));

window.addEventListener('auth:expired', () => {
  setAccessToken(null);
// pour mise à vide du panier qui sera affiché
  useCartStore.setState({ cart: { items: [], totalCents: 0 } });
  useAuthStore.setState({ user: null });
});