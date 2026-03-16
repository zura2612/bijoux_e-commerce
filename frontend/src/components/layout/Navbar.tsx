// fichier frontend/src/components/layout/Navbar.tsx
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, UserIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import toast from 'react-hot-toast';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { cart } = useCartStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const shopName = import.meta.env.VITE_SHOP_NAME || 'société';

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-stone-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
       {/*<span className="text-2xl">💍</span> */}
          <span className="font-serif text-xl font-semibold text-stone-800 tracking-wide">
            {shopName}
          </span>
        </Link>

        {/* Nav desktop Catalogue Colliers Bracelets Boucles Bagues */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-800">
          <Link to="/catalog" className="hover:text-rose-500 transition-colors">Catalogue</Link>
          <Link to="/catalog?category=colliers" className="hover:text-rose-500 transition-colors">Colliers</Link>
          <Link to="/catalog?category=bracelets" className="hover:text-rose-500 transition-colors">Bracelets</Link>
          <Link to="/catalog?category=boucles-oreilles" className="hover:text-rose-500 transition-colors">Boucles</Link>
          <Link to="/catalog?category=bagues" className="hover:text-rose-500 transition-colors">Bagues</Link>
        </div>

        {/* Actions Panier Connexion */}
        <div className="flex items-center gap-3">
          {/* Panier */}
          <Link to="/cart" className="relative p-2 hover:bg-rose-50 rounded-lg transition-colors">
            <ShoppingBagIcon className="w-6 h-6 text-stone-600" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {itemCount}
              </span>
            )}
          </Link>

          {/* User défini ou pas */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-rose-50 rounded-lg transition-colors text-sm"
              >
                <UserIcon className="w-5 h-5 text-stone-600" />
                <span className="hidden md:block text-stone-700">{user.firstName}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 bg-white border border-stone-100 rounded-xl shadow-lg py-2 w-48 z-50">
                  {user.role === 'client' && (
		  <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-rose-50 text-stone-700" onClick={() => setMenuOpen(false)}>
                    Mes commandes
                  </Link>
		  )}

		  {user.role === 'client' && (
                  <Link to="/addresses" className="block px-4 py-2 text-sm hover:bg-rose-50 text-stone-700" onClick={() => setMenuOpen(false)}>
                    Mes adresses
                  </Link>
		  )}

                  {user.role === 'admin' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-rose-50 text-stone-700" onClick={() => setMenuOpen(false)}>
                      Administration
                    </Link>
                  )}
                  <hr className="my-1 border-stone-100" />
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm hover:bg-rose-50 text-rose-500">
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary text-sm">
              Connexion
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
