// fichier frontend/src/pages/admin/AdminOrders.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { Pagination } from '../../components/ui/Pagination';
import { useAuthStore } from '../../store/auth.store';
import type { PaginationType } from '../../types';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, MagnifyingGlassIcon, TruckIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  paid:      'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [orders, setOrders]             = useState<any[]>([]);
  const [statuses, setStatuses]         = useState<Array<{ value: string; label: string }>>([]);
  const [pagination, setPagination]     = useState<PaginationType | null>(null);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') ?? '');
  const [search, setSearch]             = useState(searchParams.get('search') ?? '');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [loading, setLoading]           = useState(true);

  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const fetchOrders = async (currentPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      if (search)       params.set('search', search);
      const { data } = await api.get(`/admin/orders?${params}`);
      setOrders(data.data);
      setPagination(data.pagination);
      setStatuses(data.statuses);
    } finally {
      setLoading(false);
    }
  };

  // Conditionné à user — ne part pas tant que fetchMe() n'a pas terminé
  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [page, filterStatus, user]);

  // Initialiser le champ tracking quand une commande est sélectionnée
  useEffect(() => {
    if (selectedOrder) {
      setTrackingInput(selectedOrder.tracking_number ?? '');
    }
  }, [selectedOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      if (search) next.set('search', search);
      else next.delete('search');
      return next;
    });
    fetchOrders(1);
  };

  const handleFilterStatus = (value: string) => {
    setFilterStatus(value);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      if (value) next.set('status', value);
      else next.delete('status');
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status });
      toast.success('Statut mis à jour');
      fetchOrders();
      if (selectedOrder?.id === orderId) setSelectedOrder((o: any) => ({ ...o, status }));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveTracking = async () => {
    if (!selectedOrder) return;
    setSavingTracking(true);
    try {
      await api.put(`/admin/orders/${selectedOrder.id}/tracking`, {
        tracking_number: trackingInput.trim() || null,
      });
      toast.success('Numéro de suivi mis à jour');
      // Mettre à jour la commande localement
      const updated = { ...selectedOrder, tracking_number: trackingInput.trim() || null };
      setSelectedOrder(updated);
      setOrders(os => os.map(o => o.id === selectedOrder.id ? updated : o));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingTracking(false);
    }
  };

  const handleExport = () => {
    window.open('/api/admin/orders/export.csv', '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-stone-800">Commandes</h1>
        <button onClick={handleExport} className="flex items-center gap-2 btn-secondary text-base border-black">
          <ArrowDownTrayIcon className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Email ou nom client..."
              className="input-field pr-9 text-sm w-56 border-black"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </button>
          </div>
        </form>

        <select
          value={filterStatus}
          onChange={e => handleFilterStatus(e.target.value)}
          className="input-field text-sm w-48 border-black"
        >
          <option value="">Tous les statuts</option>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {pagination && (
          <span className="text-sm text-black self-center">
            {pagination.total} commande{pagination.total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-black overflow-hidden">
        {loading ? (
          <div className="divide-y divide-stone-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4 animate-pulse">
                <div className="h-3 bg-stone-100 rounded w-24" />
                <div className="h-3 bg-stone-100 rounded w-32" />
                <div className="h-3 bg-stone-100 rounded w-16" />
                <div className="h-3 bg-stone-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">Aucune commande trouvée</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-black">
              <tr>
                {['Réf.', 'Client', 'Date', 'Total', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-black">
                    #{order.id}
                    {order.tracking_number && (
                      <TruckIcon className="w-3 h-3 inline ml-1.5 text-[#b5838d]" title="Numéro de suivi renseigné" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-black">{order.first_name} {order.last_name}</p>
                    <p className="text-xs text-stone-400">{order.email}</p>
                  </td>
                  <td className="px-4 py-3 text-black text-sm">
                    {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-semibold text-black">
                    {(order.total_cents / 100).toFixed(2)} €
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      className={`text-sm font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-sm font-medium text-rose-400 hover:underline"
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          onChange={handlePageChange}
        />
      )}

      {/* Modal détail */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold text-stone-800">Commande #{selectedOrder.id}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>

            <p className="text-sm text-stone-700 mb-1 font-medium">
              Client : {selectedOrder.first_name} {selectedOrder.last_name}
            </p>
            <p className="text-sm text-stone-700 mb-3">Email : {selectedOrder.email}</p>

            {/* Articles */}
            <div className="border-t pt-3 mb-3 space-y-2">
              {selectedOrder.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-stone-700 font-medium">{item.name} ×{item.quantity}</span>
                  <span className="font-medium">{((item.unitPriceCents * item.quantity) / 100).toFixed(2)} €</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-stone-800">
              <span>Total</span>
              <span className="text-rose-500">{(selectedOrder.total_cents / 100).toFixed(2)} €</span>
            </div>

            {/* Adresse */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-black font-medium mb-1">Adresse de livraison</p>
              <p className="text-sm text-stone-600 whitespace-pre-line">{selectedOrder.address}</p>
            </div>

            {/* Numéro de suivi */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-black font-medium mb-2 flex items-center gap-1.5">
                <TruckIcon className="w-3.5 h-3.5" />
                Numéro de suivi transporteur
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  placeholder="Ex : 1Z999AA10123456784"
                  className="input-field text-sm flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleSaveTracking()}
                />
                <button
                  onClick={handleSaveTracking}
                  disabled={savingTracking}
                  className="btn-primary text-sm px-3 shrink-0"
                >
                  {savingTracking ? '...' : 'Enregistrer'}
                </button>
              </div>
              {selectedOrder.tracking_number && (
                <p className="text-xs text-stone-400 mt-1.5">
                  Actuel : <span className="font-mono text-stone-600">{selectedOrder.tracking_number}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
