// fichier frontend/src/components/layout/Navbar.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBagIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { useCategoryStore, CATEGORY_EMOJIS } from '../../store/category.store';
import toast from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Tableau de bord' },
  { to: '/admin/orders',    label: 'Commandes' },
  { to: '/admin/catalog',   label: 'Catalogue' },
  { to: '/admin/clients',   label: 'Clients' },
];

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { cart } = useCartStore();
  const { categories, fetchCategories } = useCategoryStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const shopName = import.meta.env.VITE_SHOP_NAME || 'société';
  const maxNavCategories = Number(import.meta.env.VITE_NAV_MAX_CATEGORIES) || 4;

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);
  const visibleCategories = categories.slice(0, maxNavCategories);
  const hasMore = categories.length > maxNavCategories;

  useEffect(() => { fetchCategories(); }, []);

  // Fermer le menu au clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Fermer le menu au changement de route
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

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
          {/*<span className="text-2xl">💍</span>*/}
          <span className="font-serif text-xl font-semibold text-stone-800 tracking-wide">
            {shopName}
          </span>
        </Link>

        {/* Nav desktop — catégories dynamiques (max VITE_NAV_MAX_CATEGORIES, défaut 4) */}
        <div className="hidden md:flex items-center gap-6 text-xl font-medium text-stone-800">
          <Link to="/catalog" className="hover:text-rose-500 transition-colors">Catalogue</Link>
          {visibleCategories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/catalog?category=${cat.slug}`}
              className="hover:text-rose-500 transition-colors"
            >
              {CATEGORY_EMOJIS[cat.slug] ? `${CATEGORY_EMOJIS[cat.slug]} ` : ''}{cat.name}
            </Link>
          ))}
          {hasMore && (
            <Link to="/catalog" className="hover:text-rose-500 transition-colors text-black">
              +
            </Link>
          )}
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-rose-50 rounded-lg transition-colors font-medium text-xl"
              >
                <UserIcon className="w-5 h-5 text-stone-600" />
                <span className="hidden md:block text-stone-700">{user.firstName}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 bg-white border border-stone-100 rounded-xl shadow-lg py-2 w-52 z-50">

                  {/* Liens client */}
                  {user.role === 'client' && (
                    <>
                      <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-rose-50 text-stone-700">
                        Mes commandes
                      </Link>
                      <Link to="/addresses" className="block px-4 py-2 text-sm hover:bg-rose-50 text-stone-700">
                        Mes adresses
                      </Link>
                      <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-rose-50 text-stone-700">
                        Mon profil
                      </Link>
                    </>
                  )}

                  {/* Liens admin */}
                  {user.role === 'admin' && (
                    <>
                  {/*    <p className="px-4 pt-1 pb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
                        Administration
                      </p> */}
                      {adminLinks.map(({ to, label }) => (
                        <Link
                          key={to}
                          to={to}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            location.pathname === to
                              ? 'bg-rose-50 text-rose-500 font-medium'
                              : 'hover:bg-rose-50 text-stone-700'
                          }`}
                        >
                          {label}
                        </Link>
                      ))}
                    </>
                  )}

                  <hr className="my-1 border-stone-100" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-rose-50 text-rose-500"
                  >
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
