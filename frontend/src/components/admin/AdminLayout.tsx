//fichier AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
  ChartBarIcon, ShoppingBagIcon, CubeIcon,
  UsersIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/admin',         label: 'Tableau de bord', icon: ChartBarIcon,    end: true },
  { to: '/admin/orders',  label: 'Commandes',        icon: ShoppingBagIcon },
  { to: '/admin/catalog', label: 'Catalogue',        icon: CubeIcon },
  { to: '/admin/clients', label: 'Clients',          icon: UsersIcon },
];

export function AdminLayout() {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  // Pendant le chargement initial de la session, ne rien rendre
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-stone-400">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-pulse">⚙️</div>
          <p className="text-sm">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  // Redirection si non connecté ou non admin — rendu synchrone sans useEffect
  if (!user) {
console.log('AdminLayout.tsx user=null!' );
    navigate('/login');
    return null;
  }

  if (user.role !== 'admin') {
console.log('AdminLayout.tsx user.role=', user.role, ' != admin' );
    navigate('/');
    return null;
  }
//console.log('AdminLayout.tsx user.role=', user.role );

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-56 bg-stone-800 text-stone-300 shrink-0 relative">
        <div className="p-4 border-b border-stone-700">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">administration par</p>
          <p className="text-white font-medium text-sm">{user.firstName}</p>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-rose-500 text-white' : 'hover:bg-stone-700 text-stone-300'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-stone-700 absolute bottom-0 w-56">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-stone-400 hover:text-white text-sm transition-colors px-3 py-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Retour au site
          </button>
        </div>
      </aside>

      {/* Contenu de la page admin dans App.tsx Route index si path=/admin */}
      <main className="flex-1 bg-stone-50 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
