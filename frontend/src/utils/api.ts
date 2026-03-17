// fichier frontend/src/utils/api.ts
import axios from 'axios';

// Access token stocké en mémoire (perdu au reload — restauré via refresh cookie)
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const TIMEOUT = {
  DEFAULT: 10000,      // 10s - requêtes standards
  SHORT: 5000,         // 5s - health checks, ping
  LONG: 30000,         // 30s - uploads, exports
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Envoie les cookies httpOnly (refresh_token)
  timeout: TIMEOUT.DEFAULT,
  headers: { 'Content-Type': 'application/json' },
});

// Injecte le Bearer token dans chaque requête si disponible
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Intercepteur 401 — refresh automatique sauf sur les routes d'auth
let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isAuthRoute = original.url?.includes('/auth/');
    if (err.response?.status === 401 && !original._retried && !isAuthRoute) {
      original._retried = true;

      if (isRefreshing) { 
        return new Promise((resolve, reject) => {
          refreshQueue.push((ok) => ok ? resolve(api(original)) : reject(err));
        });
      }

      isRefreshing = true;
      try {
//        const { data } = await api.post('/auth/refresh');
	const {data} = await api.post('/auth/refresh', {}, { timeout: TIMEOUT.SHORT });
        setAccessToken(data.accessToken);
        refreshQueue.forEach(cb => cb(true));
        return api(original);
      } catch {
        refreshQueue.forEach(cb => cb(false));
        setAccessToken(null);
        window.dispatchEvent(new Event('auth:expired'));
        return Promise.reject(new Error('api.ts Session expirée'));
      } finally {
        isRefreshing = false;
        refreshQueue = [];
      }
    }

    const message = err.response?.data?.message ?? 'Erreur réseau';
    return Promise.reject(new Error(message));
  }
);