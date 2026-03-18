// fichier frontend/src/components/admin/AdminLayout.tsx
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export function AdminLayout() {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

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

  if (!user) {
    navigate('/login');
    return null;
  }

  if (user.role !== 'admin') {
    navigate('/');
    return null;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <Outlet />
    </main>
  );
}
