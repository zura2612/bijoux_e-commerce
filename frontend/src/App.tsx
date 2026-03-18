// fichier frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { AdminLayout } from './components/admin/AdminLayout';
import {
  HomePage, CatalogPage, ProductPage, CartPage,
  CheckoutPage, OrdersPage, OrderDetailPage, LoginPage, RegisterPage,
  OrderSuccessPage, AddressesPage, ProfilePage,
} from './pages';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCatalog } from './pages/admin/AdminCatalog';
import { AdminClients } from './pages/admin/AdminClients';
import { useAuthStore } from './store/auth.store';
import { useCartStore } from './store/cart.store';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) return null;

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  const { fetchMe, user, loading } = useAuthStore();
  const { fetchCart } = useCartStore();
  const location = useLocation();
  const shopName = import.meta.env.VITE_SHOP_NAME;
  const shopDescription = import.meta.env.VITE_SHOP_DESCRIPTION;

  useEffect(() => { fetchMe(); }, []);
  useEffect(() => { if (user) fetchCart(); }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">💍</div>
          <p className="text-stone-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        {/* Routes publiques / client */}
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/addresses" element={<AddressesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/order-success" element={<OrderSuccessPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
     
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="clients" element={<AdminClients />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer masqué dans l'admin */}
      {!location.pathname.startsWith('/admin') && (
        <footer className="bg-stone-800 text-stone-400 text-center py-6 mt-12 text-sm">
          © {new Date().getFullYear()} {shopName} — {shopDescription}
        </footer>
      )}

      <Toaster position="top-left" toastOptions={{
        style: { background: 'grey', color: 'white', borderRadius: '12px', fontSize: '18px' },
        duration: 4000,
        success: { iconTheme: { primary: 'green', secondary: 'white' } },
        error: { iconTheme: { primary: 'red', secondary: 'white' } },
      }} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true }}>
      <AppContent />
    </BrowserRouter>
  );
}
