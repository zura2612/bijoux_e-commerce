// fichier frontend/src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import type { Product, User, Cart, Order } from '../types';

// ──────────────────────────────────────────────────────────────
// 📦 DONNÉES MOCKÉES
// ──────────────────────────────────────────────────────────────

const mockCategories = [
  { id: 1, name: 'Colliers',  slug: 'colliers' },
  { id: 2, name: 'Bracelets', slug: 'bracelets' },
  { id: 3, name: 'Boucles',   slug: 'boucles' },
];

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Collier Perle Rose',
    description: 'Collier élégant avec perles roses',
    price_cents: 4500,
    stock: 15,
    image_url: 'https://via.placeholder.com/300x300/f9a8b8/ffffff?text=Collier',
    category_id: 1,
    category_name: 'Colliers',
    category_slug: 'colliers',
    created_at: '2025-01-01T00:00:00Z',
    is_new: false,
  },
  {
    id: '2',
    name: 'Bracelet Argent',
    description: 'Bracelet en argent massif',
    price_cents: 7900,
    stock: 3,
    image_url: 'https://via.placeholder.com/300x300/f9a8b8/ffffff?text=Bracelet',
    category_id: 2,
    category_name: 'Bracelets',
    category_slug: 'bracelets',
    created_at: '2025-01-01T00:00:00Z',
    is_new: true,
  },
  {
    id: '3',
    name: 'Boucles Or',
    description: "Boucles d'oreilles en plaqué or",
    price_cents: 3200,
    stock: 0,
    image_url: 'https://via.placeholder.com/300x300/f9a8b8/ffffff?text=Boucles',
    category_id: 3,
    category_name: 'Boucles',
    category_slug: 'boucles',
    created_at: '2025-01-01T00:00:00Z',
    is_new: false,
  },
];

const mockClientUser: User = {
  id: 'user-1',
  email: 'client@bijoux-michelle.fr',
  firstName: 'Marie',
  lastName: 'Dupont',
  role: 'client',
  created_at: '2025-01-01T00:00:00Z',
};

const mockAdminUser: User = {
  id: 'admin-1',
  email: 'admin@bijoux-michelle.fr',
  firstName: 'Michelle',
  lastName: 'Martin',
  role: 'admin',
  created_at: '2025-01-01T00:00:00Z',
};

// Utilisateur courant — mis à jour au login, remis à null au logout
let currentUser: User | null = null;

// Panier — structure camelCase identique à la vraie API (cart.router.ts formatCartResponse)
let mockCart: Cart = {
  items: [],
  totalCents: 0,
};

const mockOrders: Order[] = [];

// ──────────────────────────────────────────────────────────────
// 🎯 HANDLERS API
// ──────────────────────────────────────────────────────────────
export const handlers = [

  // ──────────────────────────────────────────────────────────────
  // 📦 CATALOG
  // ──────────────────────────────────────────────────────────────

  // GET /api/catalog/categories
  http.get('/api/catalog/categories', () => {
    return HttpResponse.json({ success: true, data: mockCategories });
  }),

  // GET /api/catalog/products
  http.get('/api/catalog/products', ({ request }) => {
    const url = new URL(request.url);
    const categorySlug = url.searchParams.get('category');
    const search       = url.searchParams.get('search')?.toLowerCase();
    const page         = Math.max(1, Number(url.searchParams.get('page')  ?? 1));
    const limit        = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 12)));
    const nouveautes   = url.searchParams.get('nouveautes') === 'true';

    let filtered = mockProducts;
    if (nouveautes)   filtered = filtered.filter(p => p.is_new);
    if (categorySlug) filtered = filtered.filter(p => p.category_slug === categorySlug);
    if (search)       filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)
    );

    const total  = filtered.length;
    const offset = (page - 1) * limit;
    const paged  = filtered.slice(offset, offset + limit);

    return HttpResponse.json({
      success: true,
      data: paged,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }),

  // GET /api/catalog/products/:id
  http.get('/api/catalog/products/:id', ({ params }) => {
    const product = mockProducts.find(p => p.id === params.id);
    if (!product) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ success: true, data: product });
  }),

  // ──────────────────────────────────────────────────────────────
  // 🔐 AUTHENTIFICATION
  // ──────────────────────────────────────────────────────────────

  // POST /api/auth/register
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string; firstName: string; lastName: string };
    const newUser: User = {
      id: 'user-new',
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'client',
      created_at: new Date().toISOString(),
    };
    currentUser = newUser;
    return HttpResponse.json(
      { success: true, accessToken: 'mock-access-token', user: newUser },
      { status: 201 }
    );
  }),

  // POST /api/auth/login
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    await new Promise(resolve => setTimeout(resolve, 300));

    if (body.email === mockAdminUser.email) {
      currentUser = mockAdminUser;
      return HttpResponse.json({
        success: true,
        accessToken: 'mock-admin-access-token',
        user: mockAdminUser,
      });
    }

    if (body.email.includes('@')) {
      currentUser = mockClientUser;
      return HttpResponse.json({
        success: true,
        accessToken: 'mock-client-access-token',
        user: mockClientUser,
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Identifiants invalides' },
      { status: 401 }
    );
  }),

  // POST /api/auth/refresh — appelé par auth.store.ts au démarrage (fetchMe)
  http.post('/api/auth/refresh', () => {
    if (!currentUser) {
      return HttpResponse.json(
        { success: false, message: 'Refresh token manquant' },
        { status: 401 }
      );
    }
    return HttpResponse.json({ success: true, accessToken: 'mock-access-token-refreshed' });
  }),

  // POST /api/auth/logout
  http.post('/api/auth/logout', () => {
    currentUser = null;
    mockCart = { items: [], totalCents: 0 };
    return HttpResponse.json({ success: true });
  }),

  // GET /api/auth/me — retourne l'utilisateur connecté courant
  http.get('/api/auth/me', () => {
    if (!currentUser) {
      return HttpResponse.json(
        { success: false, message: 'Non authentifié' },
        { status: 401 }
      );
    }
    return HttpResponse.json({ success: true, user: currentUser });
  }),

  // ──────────────────────────────────────────────────────────────
  // 🛒 PANIER
  // ──────────────────────────────────────────────────────────────

  // GET /api/cart
  http.get('/api/cart', () => {
    return HttpResponse.json({ success: true, data: mockCart });
  }),

  // POST /api/cart/items — body: { productId, quantity }
  http.post('/api/cart/items', async ({ request }) => {
    const body = await request.json() as { productId: string; quantity: number };
    const product = mockProducts.find(p => p.id === body.productId);

    if (!product) {
      return HttpResponse.json({ success: false, message: 'Produit introuvable' }, { status: 404 });
    }
    if (product.stock === 0) {
      return HttpResponse.json({ success: false, message: 'Produit indisponible' }, { status: 400 });
    }

    const existing = mockCart.items.find(i => i.productId === body.productId);
    if (existing) {
      existing.quantity += body.quantity;
    } else {
      mockCart.items.push({
        productId: product.id,
        name: product.name,
        priceCents: product.price_cents,
        quantity: body.quantity,
        imageUrl: product.image_url,
      });
    }
    mockCart.totalCents = mockCart.items.reduce((s, i) => s + i.priceCents * i.quantity, 0);

    return HttpResponse.json({ success: true, data: mockCart });
  }),

  // PUT /api/cart/items/:productId — body: { quantity } (0 = suppression)
  http.put('/api/cart/items/:productId', async ({ params, request }) => {
    const { quantity } = await request.json() as { quantity: number };
    if (quantity === 0) {
      mockCart.items = mockCart.items.filter(i => i.productId !== params.productId);
    } else {
      const item = mockCart.items.find(i => i.productId === params.productId);
      if (item) item.quantity = quantity;
    }
    mockCart.totalCents = mockCart.items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
    return HttpResponse.json({ success: true, data: mockCart });
  }),

  // DELETE /api/cart
  http.delete('/api/cart', () => {
    mockCart = { items: [], totalCents: 0 };
    return HttpResponse.json({ success: true });
  }),

  // ──────────────────────────────────────────────────────────────
  // 📦 COMMANDES CLIENT
  // ──────────────────────────────────────────────────────────────

  // GET /api/orders
  http.get('/api/orders', ({ request }) => {
    const url   = new URL(request.url);
    const page  = Math.max(1, Number(url.searchParams.get('page')  ?? 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));
    const total = mockOrders.length;
    const paged = mockOrders.slice((page - 1) * limit, page * limit);

    return HttpResponse.json({
      success: true,
      data: paged,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }),

  // GET /api/orders/:id
  http.get('/api/orders/:id', ({ params }) => {
    const order = mockOrders.find(o => o.id === params.id);
    if (!order) {
      return HttpResponse.json({ success: false, message: 'Commande introuvable' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: order });
  }),

  // ──────────────────────────────────────────────────────────────
  // 📊 ADMIN — DASHBOARD
  // ──────────────────────────────────────────────────────────────

  // GET /api/admin/dashboard
  http.get('/api/admin/dashboard', () => {
    const caByDay = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        day:   date.toISOString().split('T')[0],
        total: Math.floor(Math.random() * 80000) + 20000,
        count: Math.floor(Math.random() * 20) + 5,
      };
    });
    return HttpResponse.json({
      success: true,
      data: {
        caToday:      15000,
        caMonth:      125000,
        totalOrders:  45,
        ordersMonth:  12,
        totalClients: 32,
        topProducts:  [],
        caByDay,
      },
    });
  }),

  // ──────────────────────────────────────────────────────────────
  // 📊 ADMIN — COMMANDES
  // ──────────────────────────────────────────────────────────────

  // GET /api/admin/orders
  http.get('/api/admin/orders', () => {
    return HttpResponse.json({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      statuses: [],
    });
  }),

  // ──────────────────────────────────────────────────────────────
  // 👥 ADMIN — CLIENTS
  // ──────────────────────────────────────────────────────────────

  // GET /api/admin/clients
  http.get('/api/admin/clients', () => {
    return HttpResponse.json({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  }),
];
