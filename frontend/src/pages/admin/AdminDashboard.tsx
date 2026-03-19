// fichier frontend/src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { useAuthStore } from '../../store/auth.store';

interface DashboardData {
  caToday: number;
  caMonth: number;
  totalOrders: number;
  ordersMonth: number;
  totalClients: number;
  topProducts: Array<{ name: string; total_sold: number; revenue_cents: number; image_url: string }>;
  caByDay: Array<{ day: string; total: number; count: number }>;
}

interface DayData {
  day: string;
  total: number;
  count: number;
}

// Génère les 30 derniers jours au format YYYY-MM-DD
function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get('/admin/dashboard')
      .then(({ data: res }) => setData(res.data))
      .catch(err => setError(err.message ?? 'Erreur lors du chargement du tableau de bord'));
  }, [user]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
        <p className="font-semibold mb-1">Erreur de chargement</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => { setError(null); setData(null); api.get('/admin/dashboard').then(({ data: res }) => setData(res.data)).catch(e => setError(e.message)); }}
          className="mt-3 text-sm underline hover:no-underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-stone-200 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-stone-200 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-48 bg-stone-200 rounded-xl" />
          <div className="h-48 bg-stone-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const fmt = (cents: number) =>
    (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const currentMonthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const statCards = [
    { label: "CA aujourd'hui",   value: fmt(data.caToday), color: 'bg-rose-50 border-black', text: 'text-rose-600' },
    { label: `CA ${currentMonthLabel}`, value: fmt(data.caMonth), color: 'bg-rose-50 border-black', text: 'text-rose-600' },
    { label: 'Commandes (mois)', value: data.ordersMonth,  color: 'bg-blue-50 border-black',  text: 'text-blue-600' },
    { label: 'Total commandes',  value: data.totalOrders,  color: 'bg-blue-50 border-black',  text: 'text-blue-600' },
    { label: 'Clients inscrits', value: data.totalClients, color: 'bg-green-50 border-black', text: 'text-green-600' },
  ];

  // Compléter caByDay avec les jours sans commande
  const caMap = new Map(data.caByDay.map(d => [d.day, d]));
  const fullCaByDay: DayData[] = getLast30Days().map(day =>
    caMap.get(day) ?? { day, total: 0, count: 0 }
  );

  const maxCa = Math.max(...fullCaByDay.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold text-stone-800">Tableau de bord</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`border rounded-xl p-4 ${card.color}`}>
            <p className="text-xs text-black mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* CA 30 derniers jours */}
        <div className="bg-white rounded-xl border border-black p-5">
          <h2 className="font-semibold text-black mb-4">CA — 30 derniers jours</h2>
          <div className="relative flex items-end gap-0.5">
            {fullCaByDay.map(d => (
              <div key={d.day} className="h-48 w-4 flex flex-col justify-end items-center group relative">
                {/* Barre — invisible si total = 0 */}
                <div
                    className="w-3 bg-rose-300 hover:bg-rose-500 rounded-t transition-colors"
                    style={{ height: `${Math.max(1, (d.total / maxCa) * 100)}%` }}
                />
                {/* Tooltip — toujours présent */}
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-stone-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  {d.total > 0 && (
                    <><br />{(d.total / 100).toFixed(2)} € ({d.count} cmd)</>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-xl border border-black p-5">
          <h2 className="font-semibold text-stone-700 mb-4">Top 5 produits vendus</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">Aucune vente enregistrée</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-black w-5">#{i + 1}</span>
                  <div className="w-10 h-10 bg-rose-50 rounded-lg overflow-hidden shrink-0">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">💍</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{p.name}</p>
                    <p className="text-xs text-black">{p.total_sold} vendu{p.total_sold > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-rose-500 shrink-0">{fmt(p.revenue_cents)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
