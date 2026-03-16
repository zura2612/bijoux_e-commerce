import { useEffect, useState } from 'react';
import { api } from '../../utils/api';

interface DashboardData {
  caToday: number;
  caMonth: number;
  totalOrders: number;
  ordersMonth: number;
  totalClients: number;
  topProducts: Array<{ name: string; total_sold: number; revenue_cents: number; image_url: string }>;
  caByDay: Array<{ day: string; total: number; count: number }>;
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data: res }) => setData(res.data))
      .catch(err => setError(err.message ?? 'Erreur lors du chargement du tableau de bord'));
  }, []);

  if (error) {
console.log('AdminDashBoard.tsx admin/dashboard error=', error );
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
//console.log('AdminDashBoard.tsx admin/dashboard data=null' );
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

//console.log('AdminDashBoard.tsx dashboard en construction' );
  const fmt = (cents: number) =>
    (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const statCards = [
    { label: "CA aujourd'hui",    value: fmt(data.caToday),    color: 'bg-rose-50 border-rose-200',   text: 'text-rose-600' },
    { label: 'CA ce mois',        value: fmt(data.caMonth),    color: 'bg-pink-50 border-pink-200',   text: 'text-pink-600' },
    { label: 'Commandes (mois)',  value: data.ordersMonth,     color: 'bg-purple-50 border-purple-200', text: 'text-purple-600' },
    { label: 'Total commandes',   value: data.totalOrders,     color: 'bg-blue-50 border-blue-200',   text: 'text-blue-600' },
    { label: 'Clients inscrits',  value: data.totalClients,    color: 'bg-green-50 border-green-200', text: 'text-green-600' },
  ];

  const maxCa = Math.max(...data.caByDay.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold text-stone-800">Tableau de bord</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <p className="text-xs text-stone-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* CA 30 derniers jours */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-700 mb-4">CA — 30 derniers jours</h2>
          {data.caByDay.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">Aucune commande sur cette période</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {data.caByDay.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-rose-300 hover:bg-rose-400 rounded-t transition-colors cursor-default"
                    style={{ height: `${Math.max(4, (d.total / maxCa) * 100)}%` }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-stone-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    <br />{(d.total / 100).toFixed(2)} € ({d.count} cmd)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-700 mb-4">Top 5 produits vendus</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">Aucune vente enregistrée</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-stone-300 w-5">#{i + 1}</span>
                  <div className="w-10 h-10 bg-rose-50 rounded-lg overflow-hidden shrink-0">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">💍</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{p.name}</p>
                    <p className="text-xs text-stone-400">{p.total_sold} vendus</p>
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
